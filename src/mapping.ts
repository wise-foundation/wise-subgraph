import { BigInt, ethereum } from "@graphprotocol/graph-ts"
import {
  ReferralAdded,
  WiseReservation
} from "../generated/WiseLiquidityTransformer/LiquidityTransformer"
import {
  User,
  Reservation,
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
  let transaction = new Transaction(tx.hash.toHexString())
  transaction.blockNumber = block.number
  transaction.timestamp = block.timestamp
  transaction.sender = tx.from.toHexString()
  transaction.save()
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
  referral.referrer = referrer.id
  referral.referee = referee.id
  referral.amount = event.params.amount
  referral.save()

  referrer.referredEth = referrer.referredEth.plus(referral.amount)
  referrer.save()
}

export function handleWiseReservation(event: WiseReservation): void {
  let transaction = upsertTransaction(event.transaction, event.block)

  let userID = event.transaction.from.toHexString()
  let user = getOrCreateUser(userID)

  let reservationID = event.transaction.hash.toHexString() + "-" + event.params.investmentDay.toString()
  let reservation = new Reservation(reservationID)
  reservation.transaction = transaction.id
  reservation.user = user.id
  reservation.investmentDay = event.params.investmentDay
  reservation.amount = event.params.amount
  reservation.save()

  user.reservedEth = user.reservedEth.plus(reservation.amount)
  user.save()
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