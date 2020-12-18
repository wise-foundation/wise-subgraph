import {BigInt} from "@graphprotocol/graph-ts/index"
import {Global, User} from "../generated/schema"

export const ZERO = BigInt.fromI32(0)
export const ONE = BigInt.fromI32(1)
export const WEI_PER_ETH = BigInt.fromI32(10).pow(18)

export function ethVal (eth: i32): BigInt {
  return BigInt.fromI32(eth).times(WEI_PER_ETH)
}

export function getOrCreateGlobal(): Global | null {
  let global = Global.load("0")
  if (global == null) {
    global = new Global("0")
    global.userCount = ZERO
    global.reserverCount = ZERO
    global.reservationReferrerCount = ZERO
    global.cmStatusCount = ZERO
    global.cmStatusInLaunchCount = ZERO
    global.reservationCount = ZERO
    global.stakeCount = ZERO
    global.stakerCount = ZERO
    global.reservationEffectiveWei = ZERO
    global.reservationActualWei = ZERO
    global.save()
  }
  return global
}

export function createUser(id: string): User | null {
  let user = new User(id)
  user.reservationEffectiveWei = ZERO
  user.reservationActualWei = ZERO
  user.reservationReferralActualWei = ZERO
  user.reservationCount = ZERO
  user.reservationDayCount = ZERO
  user.reservationReferralCount = ZERO
  user.stakeCount = ZERO
  user.cmStatus = false
  user.cmStatusInLaunch = false
  return user
}