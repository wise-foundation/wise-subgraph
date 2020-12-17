import { BigInt, ethereum } from "@graphprotocol/graph-ts"
import {
  getOrCreateGlobal,
  createUser
} from "./shared"
import {
  ReferralAdded,
  WiseReservation,
  GeneratedStaticSupply,
  GeneratedRandomSupply,
} from "../generated/LiquidityTransformer/LiquidityTransformer"
import {
  User,
  Reservation,
  UserReservationDay,
  GlobalReservationDay,
  GlobalReservationDaySnapshot,
  Referral,
  Transaction,
} from "../generated/schema"

let CM_REFERRER_THRESHOLD = BigInt.fromI32(50).times(BigInt.fromI32(10).pow(18))

let NORMAL_SUPPLY = BigInt.fromI32(5000000).times(BigInt.fromI32(10).pow(18)),
  MAX_SUPPLY = NORMAL_SUPPLY.plus(NORMAL_SUPPLY),
  MIN_SUPPLY_1 = BigInt.fromI32(4500000).times(BigInt.fromI32(10).pow(18)),
  MIN_SUPPLY_2 = BigInt.fromI32(4000000).times(BigInt.fromI32(10).pow(18)),
  MIN_SUPPLY_3 = BigInt.fromI32(3500000).times(BigInt.fromI32(10).pow(18)),
  MIN_SUPPLY_4 = BigInt.fromI32(3000000).times(BigInt.fromI32(10).pow(18)),
  MIN_SUPPLY_5 = BigInt.fromI32(2500000).times(BigInt.fromI32(10).pow(18)),
  MIN_SUPPLY_6 = BigInt.fromI32(1).times(BigInt.fromI32(10).pow(18))

function getMinSupply (day: BigInt): BigInt {
  let dayVal = day.toI32()
  switch (dayVal) {
    case 8: case 10:
      return MIN_SUPPLY_1
    case 14: case 16: case 17:
      return MIN_SUPPLY_2
    case 21: case 23: case 25:
      return MIN_SUPPLY_3
    case 29: case 31:
      return MIN_SUPPLY_4
    case 35: case 36: case 38:
      return MIN_SUPPLY_5
    case 12: case 19: case 26: case 33: case 40: case 42: case 44: case 46: case 47: case 48:
      return MIN_SUPPLY_6
    default:
      return NORMAL_SUPPLY
  }
}

function upsertTransaction(tx: ethereum.Transaction, block: ethereum.Block): Transaction | null {
  let transaction = Transaction.load(tx.hash.toHexString())
  if (transaction == null) {
    transaction = new Transaction(tx.hash.toHexString())
    transaction.blockNumber = block.number
    transaction.timestamp = block.timestamp
    transaction.sender = tx.from.toHexString()
    transaction.referral = null
    transaction.save()
  }
  return transaction
}

export function handleReferralAdded(event: ReferralAdded): void {
  let global = getOrCreateGlobal()

  let transaction = upsertTransaction(event.transaction, event.block)

  let referrerID = event.params.referral.toHexString()
  let referrer = User.load(referrerID)
  if (referrer == null) {
    referrer = createUser(referrerID)
    global.userCount = global.userCount.plus(BigInt.fromI32(1))
  }
  if (referrer.referralCount == BigInt.fromI32(0)) {
    global.referrerCount = global.referrerCount.plus(BigInt.fromI32(1))
  }

  let refereeID = event.params.referee.toHexString()
  let referee = User.load(refereeID)
  if (referee == null) {
    referee = createUser(refereeID)
    global.userCount = global.userCount.plus(BigInt.fromI32(1))
  }
  let reservedEffectiveEth = event.params.amount.times(BigInt.fromI32(11)).div(BigInt.fromI32(10))
  referee.reservationActualWei = referee.reservationActualWei.plus(event.params.amount).minus(reservedEffectiveEth)
  global.reservationActualWei = global.reservationActualWei.plus(event.params.amount).minus(reservedEffectiveEth)
  referee.save()

  let referralID = event.transaction.hash.toHexString()
  let referral = new Referral(referralID)
  referral.transaction = transaction.id
  referral.timestamp = transaction.timestamp
  referral.referrer = referrer.id
  referral.referee = referee.id
  referral.actualWei = event.params.amount
  referral.save()

  let wasBelowCm = referrer.referralActualWei < CM_REFERRER_THRESHOLD;
  referrer.referralActualWei = referrer.referralActualWei.plus(referral.actualWei)
  referrer.referralCount = referrer.referralCount.plus(BigInt.fromI32(1))
  referrer.save()
  if (wasBelowCm && referrer.referralActualWei >= CM_REFERRER_THRESHOLD) {
    global.cmReferrerCount = global.cmReferrerCount.plus(BigInt.fromI32(1))
  }
  global.save()

  transaction.referral = referral.id
  transaction.save()

  let resList = new Array<Reservation | null>()
  let txHash = event.transaction.hash.toHexString()
  for (let i = 1; i <= 50; i++) {
    let resID = txHash + "-" + i.toString()
    let reservation = Reservation.load(resID)
    if (reservation != null) {
      resList.push(reservation)
    }
  }

  let nRes = BigInt.fromI32(resList.length)
  let dayActualWei = referral.actualWei.div(nRes)
  let remainder = referral.actualWei.mod(nRes)
  for (let i = 0; i < resList.length; i++) {
    let actualWei = i === 0
        ? dayActualWei.plus(remainder)
        : dayActualWei

    let res = resList[i]
    res.actualWei = actualWei
    res.save()

    let uResDay = UserReservationDay.load(res.user + "-" + res.investmentDay.toString())
    uResDay.actualWei = uResDay.actualWei.plus(res.actualWei).minus(res.effectiveWei)
    uResDay.save()

    let gResDay = GlobalReservationDay.load(res.investmentDay.toString())
    gResDay.actualWei = gResDay.actualWei.plus(res.actualWei).minus(res.effectiveWei)
    gResDay.save()

    let gResDaySnapshot = new GlobalReservationDaySnapshot(res.investmentDay.toString() + "-" + event.block.timestamp.toString())
    gResDaySnapshot.actualWei = gResDay.actualWei
    gResDaySnapshot.save()
  }
}

export function handleWiseReservation(event: WiseReservation): void {
  let global = getOrCreateGlobal()
  global.reservationCount = global.reservationCount.plus(BigInt.fromI32(1))

  let transaction = upsertTransaction(event.transaction, event.block)

  let userID = event.transaction.from.toHexString()
  let user = User.load(userID)
  if (user == null) {
    user = createUser(userID)
    global.userCount = global.userCount.plus(BigInt.fromI32(1))
  }
  if (user.reservationCount == BigInt.fromI32(0)) {
    global.reserverCount = global.reserverCount.plus(BigInt.fromI32(1))
  }

  let reservationID = event.transaction.hash.toHexString() + "-" + event.params.investmentDay.toString()
  let reservation = new Reservation(reservationID)
  reservation.transaction = transaction.id
  reservation.timestamp = transaction.timestamp
  reservation.user = user.id
  reservation.investmentDay = event.params.investmentDay
  reservation.effectiveWei = event.params.amount
  reservation.actualWei = event.params.amount
  reservation.referral = null
  reservation.save()

  user.reservationCount = user.reservationCount.plus(BigInt.fromI32(1))
  user.reservationEffectiveWei = user.reservationEffectiveWei.plus(reservation.effectiveWei)
  user.reservationActualWei = user.reservationActualWei.plus(reservation.effectiveWei)
  global.reservationEffectiveWei = global.reservationEffectiveWei.plus(reservation.effectiveWei)
  global.reservationActualWei = global.reservationActualWei.plus(reservation.effectiveWei)
  global.save()

  let gResDayID = reservation.investmentDay.toString()
  let gResDay = GlobalReservationDay.load(gResDayID)
  if (gResDay == null) {
    gResDay = new GlobalReservationDay(gResDayID)
    gResDay.investmentDay = reservation.investmentDay
    gResDay.minSupply = getMinSupply(gResDay.investmentDay)
    gResDay.maxSupply = MAX_SUPPLY.minus(gResDay.minSupply)
    gResDay.effectiveWei = BigInt.fromI32(0)
    gResDay.actualWei = BigInt.fromI32(0)
    gResDay.reservationCount = BigInt.fromI32(0)
    gResDay.userCount = BigInt.fromI32(0)
  }
  gResDay.effectiveWei = gResDay.effectiveWei.plus(reservation.effectiveWei)
  gResDay.actualWei = gResDay.actualWei.plus(reservation.effectiveWei)
  gResDay.reservationCount = gResDay.reservationCount.plus(BigInt.fromI32(1))

  let gResDaySnapshotID = reservation.investmentDay.toString() + "-" + event.block.timestamp.toString()
  let gResDaySnapshot = new GlobalReservationDaySnapshot(gResDaySnapshotID)
  gResDaySnapshot.timestamp = event.block.timestamp
  gResDaySnapshot.investmentDay = gResDay.investmentDay
  gResDaySnapshot.effectiveWei = gResDay.effectiveWei
  gResDaySnapshot.actualWei = gResDay.actualWei
  gResDaySnapshot.reservationCount = gResDay.reservationCount

  let uResDayID = userID + "-" + reservation.investmentDay.toString()
  let uResDay = UserReservationDay.load(uResDayID)
  if (uResDay == null) {
    uResDay = new UserReservationDay(uResDayID)
    uResDay.user = user.id
    uResDay.investmentDay = reservation.investmentDay
    uResDay.effectiveWei = BigInt.fromI32(0)
    uResDay.actualWei = BigInt.fromI32(0)
    uResDay.reservationCount = BigInt.fromI32(0)
    gResDay.userCount = gResDay.userCount.plus(BigInt.fromI32(1))
    user.reservationDayCount = user.reservationDayCount.plus(BigInt.fromI32(1))
  }
  uResDay.effectiveWei = uResDay.effectiveWei.plus(reservation.effectiveWei)
  uResDay.actualWei = uResDay.actualWei.plus(reservation.effectiveWei)
  uResDay.reservationCount = uResDay.reservationCount.plus(BigInt.fromI32(1))
  uResDay.save()

  gResDay.save()

  user.save()

  gResDaySnapshot.userCount = gResDay.userCount
  gResDaySnapshot.save()
}

export function handleGeneratedStaticSupply(event: GeneratedStaticSupply): void {
  let day = new GlobalReservationDay(event.params.investmentDay.toString())
  day.supply = event.params.staticSupply
  day.save()
}

export function handleGeneratedRandomSupply(event: GeneratedRandomSupply): void {
  let day = new GlobalReservationDay(event.params.investmentDay.toString())
  day.supply = event.params.randomSupply
  day.save()
}

/*
  // Entities can be loaded from the store using a string ID this ID
  // needs to be unique across all entities of the same type
  let entity = ExampleEntity.load(event.transaction.from.toHex())

  // Entities only exist after they have been saved to the store
  // `null` checks allow to create entities on demand
  if (entity == null) {
    entity = new ExampleEntity(event.transaction.from.toHex())

    // Entity fields can be set using simple assignments
    entity.count = BigInt.fromI32(0)
  }

  // BigInt and BigDecimal math are supported
  entity.count = entity.count + BigInt.fromI32(1)

  // Entity fields can be set based on event parameters
  entity.investmentDay = event.params.investmentDay
  entity.randomSupply = event.params.randomSupply

  // Entities can be written to the store with `.save()`
  entity.save()

  // Note: If a handler doesn't require existing field values, it is faster
  // _not_ to load the entity from the store. Instead, create it fresh with
  // `new Entity(...)`, set the fields that should be updated and save the
  // entity back to the store. Fields that were not set or unset remain
  // unchanged, allowing for partial updates to be applied.

  // It is also possible to access smart contracts from mappings. For
  // example, the contract that has emitted the event can be connected to
  // with:
  //
  // let contract = Contract.bind(event.address)
  //
  // The following functions can then be called on this contract to access
  // state variables and other data:
  //
  // - contract.REFUND_SPONSOR(...)
  // - contract.TOKEN_DEFINER(...)
  // - contract.UNISWAP_PAIR(...)
  // - contract.UNISWAP_ROUTER(...)
  // - contract.WISE_CONTRACT(...)
  // - contract._currentWiseDay(...)
  // - contract.dailyTotalInvestment(...)
  // - contract.dailyTotalSupply(...)
  // - contract.fundedDays(...)
  // - contract.g(...)
  // - contract.investmentsOnAllDays(...)
  // - contract.investorAccountCount(...)
  // - contract.investorAccounts(...)
  // - contract.investorBalances(...)
  // - contract.investorTotalBalance(...)
  // - contract.investorsOnAllDays(...)
  // - contract.investorsOnDay(...)
  // - contract.myInvestmentAmount(...)
  // - contract.myInvestmentAmountAllDays(...)
  // - contract.myTotalInvestmentAmount(...)
  // - contract.payoutInvestorAddress(...)
  // - contract.payoutReferralAddress(...)
  // - contract.referralAccountCount(...)
  // - contract.referralAccounts(...)
  // - contract.referralAmount(...)
  // - contract.referralTokens(...)
  // - contract.requestRefund(...)
  // - contract.supplyOnAllDays(...)
  // - contract.uniqueInvestorCount(...)
  // - contract.uniqueInvestors(...)
}
 */