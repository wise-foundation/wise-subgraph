import {BigInt} from "@graphprotocol/graph-ts/index";
import {Global, User} from "../generated/schema";

export const ZERO = BigInt.fromI32(0)
export const ONE = BigInt.fromI32(1)

export function getOrCreateGlobal(): Global | null {
  let global = Global.load("0")
  if (global == null) {
    global = new Global("0")
    global.userCount = ZERO
    global.reserverCount = BigInt.fromI32(0)
    global.referrerCount = BigInt.fromI32(0)
    global.cmStatusCount = BigInt.fromI32(0)
    global.cmStatusInLaunchCount = BigInt.fromI32(0)
    global.reservationCount = BigInt.fromI32(0)
    global.stakeCount = BigInt.fromI32(0)
    global.stakerCount = BigInt.fromI32(0)
    global.reservationEffectiveWei = BigInt.fromI32(0)
    global.reservationActualWei = BigInt.fromI32(0)
    global.save()
  }
  return global
}

export function createUser(id: string): User | null {
  let user = new User(id)
  user.reservationEffectiveWei = BigInt.fromI32(0)
  user.reservationActualWei = BigInt.fromI32(0)
  user.referralActualWei = BigInt.fromI32(0)
  user.reservationCount = BigInt.fromI32(0)
  user.reservationDayCount = BigInt.fromI32(0)
  user.referralCount = BigInt.fromI32(0)
  user.stakeCount = BigInt.fromI32(0)
  user.cmStatus = false
  user.cmStatusInLaunch = false
  return user
}