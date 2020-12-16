import {BigInt} from "@graphprotocol/graph-ts/index";
import {Global, User} from "../generated/schema";

export function getOrCreateGlobal(): Global | null {
  let global = Global.load("0")
  if (global == null) {
    global = new Global("0")
    global.userCount = BigInt.fromI32(0)
    global.reserverCount = BigInt.fromI32(0)
    global.referrerCount = BigInt.fromI32(0)
    global.cmReferrerCount = BigInt.fromI32(0)
    global.reservationCount = BigInt.fromI32(0)
    global.stakeCount = BigInt.fromI32(0)
    global.stakerCount = BigInt.fromI32(0)
    global.save()
  }
  return global
}

export function createUser(id: string): User | null {
  let user = new User(id)
  user.reservedEth = BigInt.fromI32(0)
  user.referredEth = BigInt.fromI32(0)
  user.reservationCount = BigInt.fromI32(0)
  user.reservationDayCount = BigInt.fromI32(0)
  user.referralCount = BigInt.fromI32(0)
  return user
}