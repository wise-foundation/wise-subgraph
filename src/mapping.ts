import { BigInt, ethereum } from "@graphprotocol/graph-ts"
import {
  ReferralAdded,
  WiseReservation,
  GeneratedStaticSupply,
  GeneratedRandomSupply,
} from "../generated/WiseLiquidityTransformer/LiquidityTransformer"
import {
  User,
  Reservation,
  UserReservationDay,
  GlobalReservationDay,
  GlobalReservationDaySnapshot,
  Referral,
  Transaction,
} from "../generated/schema"

function getOrCreateUser(id: string): User | null {
  let user = User.load(id)
  if (user == null) {
    user = new User(id)
    user.reservedEth = BigInt.fromI32(0)
    user.referredEth = BigInt.fromI32(0)
  }
  return user
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
  let transaction = upsertTransaction(event.transaction, event.block)

  let referrerID = event.params.referral.toHexString()
  let referrer = getOrCreateUser(referrerID)

  let refereeID = event.params.referee.toHexString()
  let referee = getOrCreateUser(refereeID)
  referee.save()

  let referralID = event.transaction.hash.toHexString()
  let referral = new Referral(referralID)
  referral.transaction = transaction.id
  referral.timestamp = transaction.timestamp
  referral.referrer = referrer.id
  referral.referee = referee.id
  referral.amount = event.params.amount
  referral.save()

  referrer.referredEth = referrer.referredEth.plus(referral.amount)
  referrer.save()

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
  let dayRealAmount = referral.amount.div(nRes)
  let remainder = referral.amount.mod(nRes)
  for (let i = 0; i < resList.length; i++) {
    let realAmount = i === 0
        ? dayRealAmount.plus(remainder)
        : dayRealAmount

    let res = resList[i]
    res.realAmount = realAmount
    res.save()

    let uResDay = UserReservationDay.load(res.user + "-" + res.investmentDay.toString())
    uResDay.totalRealAmount = uResDay.totalRealAmount.plus(realAmount).minus(res.amount)
    uResDay.save()

    let gResDay = GlobalReservationDay.load(res.investmentDay.toString())
    gResDay.totalRealAmount = gResDay.totalRealAmount.plus(realAmount).minus(res.amount)
    gResDay.save()

    let gResDaySnapshot = new GlobalReservationDaySnapshot(res.investmentDay.toString() + "-" + event.block.timestamp.toString())
    gResDaySnapshot.totalRealAmount = gResDay.totalRealAmount
    gResDaySnapshot.save()
  }
}

export function handleWiseReservation(event: WiseReservation): void {
  let transaction = upsertTransaction(event.transaction, event.block)

  let userID = event.transaction.from.toHexString()
  let user = getOrCreateUser(userID)

  let reservationID = event.transaction.hash.toHexString() + "-" + event.params.investmentDay.toString()
  let reservation = new Reservation(reservationID)
  reservation.transaction = transaction.id
  reservation.timestamp = transaction.timestamp
  reservation.user = user.id
  reservation.investmentDay = event.params.investmentDay
  reservation.amount = event.params.amount
  reservation.realAmount = event.params.amount
  reservation.referral = null
  reservation.save()

  user.reservedEth = user.reservedEth.plus(reservation.amount)
  user.save()

  let gResDayID = reservation.investmentDay.toString()
  let gResDay = GlobalReservationDay.load(gResDayID)
  if (gResDay == null) {
    gResDay = new GlobalReservationDay(gResDayID)
    gResDay.investmentDay = reservation.investmentDay
    gResDay.totalAmount = BigInt.fromI32(0)
    gResDay.totalRealAmount = BigInt.fromI32(0)
    gResDay.reservationCount = BigInt.fromI32(0)
    gResDay.userCount = BigInt.fromI32(0)
  }
  gResDay.totalAmount = gResDay.totalAmount.plus(reservation.amount)
  gResDay.totalRealAmount = gResDay.totalRealAmount.plus(reservation.amount)
  gResDay.reservationCount = gResDay.reservationCount.plus(BigInt.fromI32(1))

  let gResDaySnapshotID = reservation.investmentDay.toString() + "-" + event.block.timestamp.toString()
  let gResDaySnapshot = new GlobalReservationDaySnapshot(gResDaySnapshotID)
  gResDaySnapshot.timestamp = event.block.timestamp
  gResDaySnapshot.investmentDay = gResDay.investmentDay
  gResDaySnapshot.totalAmount = gResDay.totalAmount
  gResDaySnapshot.totalRealAmount = gResDay.totalRealAmount
  gResDaySnapshot.reservationCount = gResDay.reservationCount

  let uResDayID = userID + "-" + reservation.investmentDay.toString()
  let uResDay = UserReservationDay.load(uResDayID)
  if (uResDay == null) {
    uResDay = new UserReservationDay(uResDayID)
    uResDay.user = user.id
    uResDay.investmentDay = reservation.investmentDay
    uResDay.totalAmount = BigInt.fromI32(0)
    uResDay.totalRealAmount = BigInt.fromI32(0)
    uResDay.reservationCount = BigInt.fromI32(0)
    gResDay.userCount = gResDay.userCount.plus(BigInt.fromI32(1))
  }
  uResDay.totalAmount = uResDay.totalAmount.plus(reservation.amount)
  uResDay.totalRealAmount = uResDay.totalRealAmount.plus(reservation.amount)
  uResDay.reservationCount = uResDay.reservationCount.plus(BigInt.fromI32(1))
  uResDay.save()

  gResDay.save()

  gResDaySnapshot.userCount = gResDay.userCount
  gResDaySnapshot.save()
}

export function handleGeneratedStaticSupply(event: GeneratedStaticSupply): void {
  let day = GlobalReservationDay.load(event.params.investmentDay.toString())
  day.supply = event.params.staticSupply
  day.save()
}

export function handleGeneratedRandomSupply(event: GeneratedRandomSupply): void {
  let day = GlobalReservationDay.load(event.params.investmentDay.toString())
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