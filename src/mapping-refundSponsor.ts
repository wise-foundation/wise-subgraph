import { RefundIssued } from "../generated/RefundSponsor/RefundSponsor"
import { createUser } from "./shared"

export function handleRefundIssued (event: RefundIssued): void {
  let userID = event.params.refundedTo.toHexString()
  let user = createUser(userID)
  user.gasRefunded = event.params.amount
  user.save()
}
