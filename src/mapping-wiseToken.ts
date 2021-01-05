import { BigInt, ethereum } from "@graphprotocol/graph-ts"
import {
  getOrCreateGlobal,
  createUser,
  ZERO,
  ONE,
} from "./shared"
import {
  GiveStatusCall,
  StakeStart,
  StakeEnd,
  InterestScraped,
} from "../generated/WiseToken/WiseToken"
import {
  Stake,
  User,
} from "../generated/schema"

export function handleGiveStatus (call: GiveStatusCall): void {
  let referrerID = call.inputs._referrer.toHex()
  let referrer = User.load(referrerID)
  if (referrer == null) {
    referrer = createUser(referrerID)
  }
  if (referrer.cmStatus === false) {
    referrer.cmStatus = true
    referrer.cmStatusInLaunch = true

    let global = getOrCreateGlobal()
    global.cmStatusCount = global.cmStatusCount.plus(ONE)
    global.cmStatusInLaunchCount = global.cmStatusInLaunchCount.plus(ONE)
    global.save()
  }

  referrer.save()
}

export function handleStakeStart (event: StakeStart): void {
  let global = getOrCreateGlobal()
  global.stakeCount = global.stakeCount.plus(ONE)

  let stakerID = event.params.stakerAddress.toHexString()
  let staker = User.load(stakerID)
  if (staker == null) {
    staker = createUser(stakerID)
    global.userCount = global.userCount.plus(ONE)
    global.stakerCount = global.stakerCount.plus(ONE)
  }
  staker.stakeCount = staker.stakeCount.plus(ONE)
  staker.save()

  let referrerID = event.params.referralAddress.toHexString()
  let referrer = User.load(referrerID)
  if (referrer == null) {
    referrer = createUser(referrerID)
    global.userCount = global.userCount.plus(ONE)
  }
  if (event.params.referralShares.gt(ZERO)) {
    if (referrer.cmStatus === false) {
      global.cmStatusCount = global.cmStatusCount.plus(ONE)
    }
    referrer.cmStatus = true
  }
  referrer.save()
  global.save()

  let stake = new Stake(event.params.stakeID.toHexString())
  stake.staker = staker.id
  stake.referrer = referrer.id
  stake.principal = event.params.stakedAmount
  stake.shares = event.params.stakesShares
  stake.cmShares = event.params.referralShares
  stake.currentShares = event.params.stakesShares
  stake.startDay = event.params.startDay
  stake.lockDays = event.params.lockDays
  stake.daiEquivalent = event.params.daiEquivalent
  stake.reward = null
  stake.closeDay = null
  stake.penalty = null
  stake.scraped = ZERO
  stake.sharesPenalized = ZERO
  stake.referrerSharesPenalized = ZERO
  stake.scrapeCount = ZERO
  stake.scrapedTotalYodas = ZERO
  stake.lastScrapeDay = null
  stake.save()
}

export function handleStakeEnd (event: StakeEnd): void {
  let stake = new Stake(event.params.stakeID.toHexString())
  stake.closeDay = event.params.closeDay
  stake.penalty = event.params.penaltyAmount
  stake.reward = event.params.rewardAmount
  stake.save()
}

export function handleInterestScraped (event: InterestScraped): void {
  let stake = Stake.load(event.params.stakerAddress.toHexString())
  stake.scrapeCount = stake.scrapeCount + ONE
  stake.lastScrapeDay = event.params.scrapeDay
  stake.scrapedTotalYodas = stake.scrapedTotalYodas + event.params.scrapeAmount
  stake.currentShares = stake.currentShares - event.params.stakersPenalty
  stake.sharesPenalized = stake.sharesPenalized + event.params.stakersPenalty
  stake.referrerSharesPenalized = stake.referrerSharesPenalized + event.params.referrerPenalty
  stake.save()
}