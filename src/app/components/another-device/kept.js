const UNPAID = ['no_subscription', 'subscription_expired', 'account_cancelled']

// Where a device keeps an identity: 'bucket', 'account', 'unpaid' (signed in,
// the account not paid up) or 'nowhere'.
export default (queries, identity) => {
  const remote = queries.remoteAdapterForIdentity(identity)

  if (!remote) return 'nowhere'
  if (remote.data.bucket) return 'bucket'

  return UNPAID.includes(queries.syncStatusForIdentity(identity).reason) ? 'unpaid' : 'account'
}
