import { BigInt, ethereum } from "@graphprotocol/graph-ts"
import {
  getOrCreateGlobal,
  createUser
} from "./shared"
import {
  StakeStart
} from "../generated/WiseToken/WiseToken"
import {
  Stake,
  User
} from "../generated/schema"

export function handleStakeStart (event: StakeStart): void {
  let global = getOrCreateGlobal();
  global.stakeCount = global.stakeCount.plus(BigInt.fromI32(1))

  let stakerID = event.params.stakerAddress.toHexString()
  let staker = User.load(stakerID)
  if (staker == null) {
    staker = createUser(stakerID)
    global.userCount = global.userCount.plus(BigInt.fromI32(1))
    global.stakerCount = global.stakerCount.plus(BigInt.fromI32(1))
  }
  staker.stakeCount = staker.stakeCount.plus(BigInt.fromI32(1))
  staker.save()

  let referrerID = event.params.referralAddress.toHexString()
  let referrer = User.load(referrerID)
  if (referrer == null) {
    referrer = createUser(referrerID)
    global.userCount = global.userCount.plus(BigInt.fromI32(1))
  }
  referrer.save()
  global.save()

  let stake = new Stake(event.params.stakeID.toHexString())
  stake.staker = staker.id
  stake.referrer = referrer.id
  stake.principal = event.params.stakedAmount
  stake.shares = event.params.stakesShares
  stake.cmShares = event.params.referralShares
  stake.startDay = event.params.startDay
  stake.lockDays = event.params.lockDays
  stake.daiEquivalent = event.params.daiEquivalent
  stake.save()
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