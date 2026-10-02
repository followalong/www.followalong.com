import { describe, test, expect, vi } from 'vitest'
import HostedAdapter, { HOSTED_URL, TIMEOUT_MS, sendCode, signIn, checkout, portal, account, deleteAccount, appleTransaction } from './hosted.js'

const SIGNED_IN = { token: 'tok_abc', email: 'reader@example.com', accountId: 'acc_1' }

const adapter = (fetch) => new HostedAdapter({ fetch }, { id: 'account', data: Object.assign({}, SIGNED_IN) })

const response = ({ status = 200, body = '', headers = {} }) => ({
  ok: status >= 200 && status < 300,
  status,
  text: () => Promise.resolve(body),
  headers: { get: (name) => headers[name.toLowerCase()] ?? null }
})

// The service over fetch, with every request recorded.
const service = (answer) => {
  const requests = []
  const fetch = (url, init = {}) => {
    requests.push({ url: `${url}`, method: init.method || 'GET', body: init.body, headers: init.headers || {} })

    return Promise.resolve((answer || (() => response({ body: 'the log', headers: { etag: '"current"' } })))(requests[requests.length - 1]))
  }

  return { requests, fetch }
}

const refuses = (refusal) => service(() => response(refusal))

const sealed = (body) => Promise.resolve(`sealed ${body}`)

describe('HostedAdapter', () => {
  test('reads the log as the account that signed in', async () => {
    const { requests, fetch } = service()
    const read = await adapter(fetch).get({}, sealed, {})

    expect(read).toEqual({ status: 200, body: 'the log', etag: '"current"' })
    expect(requests[0].url).toEqual(`${HOSTED_URL}/v1/log`)
    expect(requests[0].headers.authorization).toEqual('Bearer tok_abc')
  })

  test('asks for anything but the copy it holds, and takes 304 for an answer', async () => {
    const { requests, fetch } = service(() => response({ status: 304 }))
    const read = await adapter(fetch).get({}, sealed, { etag: '"held"' })

    expect(read).toEqual({ status: 304, body: '', etag: '"held"' })
    expect(requests[0].headers['if-none-match']).toEqual('"held"')
  })

  test('reads an account with nothing stored yet as nothing there', async () => {
    const { fetch } = refuses({ status: 404, body: '{"error":"no_log"}' })

    await expect(adapter(fetch).get({}, sealed, {})).rejects.toThrow(/404 no_log/)
  })

  // The service reads what it holds, so the identity's own password is not
  // put on it: a second device finds its identity by reading this log.
  test('sends the log as it is, whatever password the identity has', async () => {
    const { requests, fetch } = service(() => response({ headers: { etag: '"v2"' } }))

    expect(await adapter(fetch).save('the log', sealed, { 'if-match': '"v1"' })).toEqual({ etag: '"v2"' })
    expect(requests[0]).toMatchObject({ method: 'PUT', body: 'the log' })
    expect(requests[0].headers['if-match']).toEqual('"v1"')
  })

  // A bucket's keys are in the log that configured it, and this log is one
  // the service can read.
  test('never sends a log that holds the keys to a bucket', async () => {
    const { requests, fetch } = service()
    const log = '4/addons/s3/configure/v2.1 {"type":"S3Adapter","data":{"bucket":"mine","secretAccessKey":"secret"}}'

    await expect(adapter(fetch).save(log, sealed, { 'if-match': '"v1"' })).rejects.toThrow(/keys to your own storage/)
    expect(requests).toEqual([])
  })

  test('sends an article that only mentions such a key', async () => {
    const { requests, fetch } = service(() => response({ headers: { etag: '"v2"' } }))
    const log = `4/entries/1/create/v2.1 ${JSON.stringify({ data: { content: 'Set "secretAccessKey" in the config.' } })}`

    await adapter(fetch).save(log, sealed, { 'if-match': '"v1"' })

    expect(requests.length).toEqual(1)
  })

  test('carries the status of a write another device beat, so sync reads and merges again', async () => {
    const { fetch } = refuses({ status: 412, body: '{"error":"version_conflict"}' })

    await expect(adapter(fetch).save('a', sealed, { 'if-match': '"v1"' })).rejects.toMatchObject({ status: 412 })
  })

  test('says an account is out of room rather than that a request was refused', async () => {
    const { fetch } = refuses({ status: 413, body: '{"error":"quota_exceeded"}' })

    await expect(adapter(fetch).save('a', sealed, { 'if-match': '"v1"' })).rejects.toThrow(/out of space/)
  })

  test('tells never paid, a lapsed subscription and a closed account apart', async () => {
    const never = refuses({ status: 402, body: '{"error":"no_subscription"}' })
    const lapsed = refuses({ status: 402, body: '{"error":"subscription_expired"}' })
    const closed = refuses({ status: 402, body: '{"error":"account_cancelled"}' })

    await expect(adapter(never.fetch).get({}, sealed, {})).rejects.toMatchObject({ status: 402, reason: 'no_subscription', message: /subscribe/i })
    await expect(adapter(lapsed.fetch).get({}, sealed, {})).rejects.toMatchObject({ status: 402, reason: 'subscription_expired', message: /renew/i })
    await expect(adapter(closed.fetch).get({}, sealed, {})).rejects.toMatchObject({ status: 402, reason: 'account_cancelled', message: /closed/i })
  })

  test('says when to come back after too many requests, in the unit a person reads', async () => {
    const soon = refuses({ status: 429, body: '{"error":"too_many_requests"}', headers: { 'retry-after': '45' } })
    const later = refuses({ status: 429, body: '{"error":"too_many_requests"}', headers: { 'retry-after': '180' } })
    const unsaid = refuses({ status: 429, body: '{"error":"too_many_requests"}' })

    await expect(adapter(soon.fetch).get({}, sealed, {})).rejects.toThrow(/in 45 seconds/)
    await expect(adapter(later.fetch).get({}, sealed, {})).rejects.toThrow(/in 3 minutes/)
    await expect(adapter(unsaid.fetch).get({}, sealed, {})).rejects.toThrow(/in a moment/)
  })

  test('carries a dead token up as a 401, for sync to sign the device out', async () => {
    const { fetch } = refuses({ status: 401, body: '{"error":"unauthorized"}' })

    await expect(adapter(fetch).get({}, sealed, {})).rejects.toMatchObject({ status: 401, message: /signed out/i })
  })

  // A bare TypeError is how a bucket says it cannot take a condition, and
  // this service always can.
  test('says the service could not be reached, and never as a TypeError', async () => {
    const offline = adapter(() => Promise.reject(new TypeError('Failed to fetch')))
    const failed = await offline.save('a', sealed, { 'if-match': '"v1"' }).catch((e) => e)

    expect(failed.name).toEqual('Error')
    expect(failed.message).toEqual('Could not reach the sync service. Check your connection.')
  })

  test('says an unconditional write is not one it makes', async () => {
    const { fetch } = refuses({ status: 428, body: '{"error":"condition_required"}' })

    await expect(adapter(fetch).save('a', sealed)).rejects.toMatchObject({ status: 428, message: /name the copy/ })
  })

  test('gives up on a service that never answers', async () => {
    vi.useFakeTimers()

    const read = adapter((url, init) => new Promise((resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))
    })).get({}, sealed, {})

    vi.advanceTimersByTime(TIMEOUT_MS)

    await expect(read).rejects.toThrow(/did not answer in time/)

    vi.useRealTimers()
  })

  test('has nothing to hand another device', () => {
    expect(adapter().portableData()).toEqual({})
  })

  test('is ready once there is a token', () => {
    expect(adapter().validate({})).toBe(false)
    expect(adapter().validate(SIGNED_IN)).toBe(true)
  })
})

describe('signing in', () => {
  test('asks for a code to be mailed', async () => {
    const { requests, fetch } = service(() => response({ status: 202, body: '{"result":"sent"}' }))

    await sendCode({ fetch, email: 'reader@example.com' })

    expect(requests[0]).toMatchObject({ url: `${HOSTED_URL}/v1/signin/codes`, method: 'POST', body: '{"email":"reader@example.com"}' })
  })

  test('trades the code for a token', async () => {
    const { requests, fetch } = service(() => response({ status: 201, body: '{"id":"acc_1","token":"tok_abc"}' }))

    expect(await signIn({ fetch, email: 'reader@example.com', code: '123456', device: 'MacIntel' })).toEqual({ id: 'acc_1', token: 'tok_abc' })
    expect(JSON.parse(requests[0].body)).toEqual({ email: 'reader@example.com', code: '123456', device: 'MacIntel' })
  })

  // The same answer whether or not the address has an account, so nobody can
  // use the form to ask who reads here.
  test('says a wrong code is wrong, and names no address', async () => {
    const { fetch } = refuses({ status: 401, body: '{"error":"bad_code"}' })
    const failed = await signIn({ fetch, email: 'reader@example.com', code: '000000' }).catch((e) => e)

    expect(failed.message).toEqual('That code is not right. Ask for a new one and try again.')
    expect(failed.message).not.toContain('reader@example.com')
  })
})

describe('the account', () => {
  test('answers the plan and status the service holds', async () => {
    const { requests, fetch } = service(() => response({ body: '{"id":"acc_1","plan":"plus","status":"active","source":"stripe","expires_at":null}' }))

    expect(await account({ fetch, token: 'tok_abc' })).toMatchObject({ plan: 'plus', source: 'stripe' })
    expect(requests[0]).toMatchObject({ url: `${HOSTED_URL}/v1/account`, method: 'GET' })
    expect(requests[0].headers.authorization).toEqual('Bearer tok_abc')
  })

  test('answers a page to pay on and a page to manage billing on', async () => {
    const { requests, fetch } = service((request) => response({ status: 201, body: JSON.stringify({ url: `https://stripe.example${new URL(request.url).pathname}` }) }))

    expect(await checkout({ fetch, token: 'tok_abc' })).toEqual('https://stripe.example/v1/checkout')
    expect(await portal({ fetch, token: 'tok_abc' })).toEqual('https://stripe.example/v1/portal')
    expect(requests.map((request) => request.method)).toEqual(['POST', 'POST'])
  })

  test('says each refusal to sell or manage in a sentence', async () => {
    const say = (body, ask) => ask({ fetch: refuses({ status: 409, body }).fetch, token: 'tok_abc' }).catch((e) => e.message)

    expect(await say('{"error":"already_subscribed"}', checkout)).toEqual('This account already has a subscription.')
    expect(await say('{"error":"portal_failed"}', portal)).toEqual('We could not open your billing page. Try again in a minute.')
  })

  test('deletes the account the token names', async () => {
    const { requests, fetch } = service(() => response({ status: 204 }))

    await deleteAccount({ fetch, token: 'tok_abc' })

    expect(requests[0]).toMatchObject({ url: `${HOSTED_URL}/v1/account`, method: 'DELETE' })
  })

  test('says nothing was removed when the service could not delete', async () => {
    const { fetch } = refuses({ status: 502, body: '{"error":"delete_failed"}' })

    await expect(deleteAccount({ fetch, token: 'tok_abc' })).rejects.toThrow('We could not delete your account. Nothing was removed. Try again in a minute.')
  })
})

describe('an App Store purchase', () => {
  test('hands the signed transaction over and answers the account as it now stands', async () => {
    const { requests, fetch } = service(() => response({ body: '{"id":"acc_1","plan":"plus","status":"active","source":"apple","expires_at":"2099-01-01T00:00:00Z"}' }))

    expect(await appleTransaction({ fetch, token: 'tok_abc', signedTransaction: 'jws.acc_1.1' })).toMatchObject({ source: 'apple' })
    expect(requests[0]).toMatchObject({ url: `${HOSTED_URL}/v1/apple/transactions`, method: 'POST', body: '{"signed_transaction":"jws.acc_1.1"}' })
    expect(requests[0].headers.authorization).toEqual('Bearer tok_abc')
  })

  test('says each refusal in a sentence', async () => {
    const say = (status, body) => appleTransaction({ fetch: refuses({ status, body }).fetch, token: 'tok_abc', signedTransaction: 'jws' }).catch((e) => e.message)

    expect(await say(400, '{"error":"bad_payload"}')).toEqual('We could not read that purchase. Try Restore purchases.')
    expect(await say(400, '{"error":"bad_signature"}')).toEqual('We could not confirm that purchase with Apple. Try Restore purchases.')
    expect(await say(400, '{"error":"wrong_bundle"}')).toEqual('That purchase was made in a different app.')
    expect(await say(403, '{"error":"wrong_account"}')).toEqual('That purchase belongs to a different account. Sign in with the email you subscribed with.')
    expect(await say(503, '{"error":"apple_disabled"}')).toEqual('This service is not taking App Store subscriptions right now.')
  })
})
