import { BigInt, ethereum } from "@graphprotocol/graph-ts"
import {
  StakeStart
} from "../generated/WiseToken/WiseToken"
import {
  Stake
} from "../generated/schema"

export function handleStakeStart (event: StakeStart): void {
  let stake = new Stake(event.params.stakeID.toHexString())
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