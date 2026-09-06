import { mountApp, describe, story, vi, s3Bucket, s3Response } from './helper.js'

const IDENTITY = `
  0/identities/abc123/create/v2.1 {"name":"My Account"}
  1/feeds/543/create/v2.1 {"url":"https://foo.bar/rss.xml","data":{"title":"Feed title"}}
  2/entries/6363/create/v2.1 {"feedId":"543","data":{"guid":"987","title":"Entry title"}}
`

const withS3 = `${IDENTITY}
  3/addons/777/configure/v2.1 {"type":"S3Adapter","data":{"bucket":"b","region":"r","accessKeyId":"a","secretAccessKey":"s"}}
`

describe('Know my backup status', () => {
  describe('With nothing set up', () => {
    let app

    beforeEach(async () => {
      app = await mountApp({ state: { abc123: { config: {}, data: IDENTITY } } })

      await app.click('[aria-label="You"]')
    })

    story('says plainly that nothing is backed up', () => {
      expect(app.text()).toContain('Not backed up')
    })

    story('offers a way to set it up', () => {
      expect(app.find('[aria-label="Set up backups"]').exists()).toEqual(true)
    })

    story('does not claim a successful sync', () => {
      expect(app.vm.queries.syncStatusForIdentity(app.vm.identity).status).toEqual('off')
    })
  })

  describe('With a remote configured', () => {
    let app
    let save

    beforeEach(async () => {
      save = vi.fn().mockResolvedValue()

      app = await mountApp({
        state: { abc123: { config: {}, data: withS3 } },
        awsClient: s3Bucket({
          answer: (request) => {
            if (request.method === 'PUT') {
              save(request)

              return s3Response({ headers: { etag: '"written"' } })
            }

            return s3Response({ status: 404, body: '<Error><Code>NoSuchKey</Code></Error>' })
          }
        }).client
      })

      await app.click('[aria-label="You"]')
    })

    story('names what it backs up to', () => {
      expect(app.text()).toContain('S3 Storage')
    })

    story('counts what the backup contains', () => {
      const counts = app.vm.queries.backupContentsForIdentity(app.vm.identity)

      expect(counts.feeds).toEqual(1)
      expect(counts.entries).toEqual(1)
      expect(counts.events).toBeGreaterThan(0)
    })

    describe('Backing up now', () => {
      beforeEach(async () => {
        await app.click('[aria-label="Back up now"]')
      })

      story('records that it succeeded', () => {
        const status = app.vm.queries.syncStatusForIdentity(app.vm.identity)

        expect(status.status).toEqual('saved')
        expect(status.at).toBeGreaterThan(0)
      })
    })
  })

  // 'off' is a description of having nowhere to sync to, so it cannot outlive
  // somewhere being configured. It used to sit in the config until the next
  // sync, and the page said "Not backed up" over a working bucket.
  describe('With a remote just configured', () => {
    let app

    beforeEach(async () => {
      app = await mountApp({
        state: { abc123: { config: { syncStatus: 'off' }, data: withS3 } }
      })

      await app.click('[aria-label="You"]')
    })

    story('does not claim there is nowhere to back up', () => {
      expect(app.vm.queries.syncStatusForIdentity(app.vm.identity).status).toEqual('idle')
      expect(app.text()).not.toContain('Not backed up')
    })
  })

  describe('When the remote refuses', () => {
    let app

    beforeEach(async () => {
      app = await mountApp({
        state: { abc123: { config: {}, data: withS3 } },
        awsClient: s3Bucket({
          answer: (request) => {
            return request.method === 'PUT'
              ? s3Response({ status: 403, body: '<Error><Code>Access denied</Code></Error>' })
              : s3Response({ status: 404, body: '<Error><Code>NoSuchKey</Code></Error>' })
          }
        }).client
      })

      await app.click('[aria-label="You"]')
      await app.click('[aria-label="Back up now"]')
    })

    story('says so rather than staying quiet', () => {
      const status = app.vm.queries.syncStatusForIdentity(app.vm.identity)

      expect(status.status).toEqual('failed')
      expect(status.error).toContain('Access denied')
    })

    story('shows the failure', () => {
      expect(app.text()).toContain('Access denied')
    })
  })

  // Reading the bucket at boot fails quietly by design - the app is already
  // painted and there is nothing to interrupt. But the card went on
  // reporting the last successful write, so a device whose keys had been
  // rotated, or whose bucket had gone, looked perfectly backed up. For
  // somebody who only reads, no write ever follows to find out.
  describe('When the bucket cannot be read at boot', () => {
    let app

    const refusing = (answer) => mountApp({
      state: { abc123: { config: { syncStatus: 'saved', syncedAt: 1700000000000, remoteEtag: '"held"' }, data: withS3 } },
      awsClient: s3Bucket({ answer }).client
    })

    const refused = () => s3Response({ status: 403, body: '<Error><Code>AccessDenied</Code></Error>' })

    beforeEach(async () => {
      app = await refusing(refused)
    })

    story('says it could not check, rather than nothing', () => {
      const status = app.vm.queries.syncStatusForIdentity(app.vm.identity)

      expect(status.checkError).toMatch(/could not check/i)
      expect(status.checkError).toContain('AccessDenied')
    })

    // What it last managed to save is still true, and still worth showing.
    // Saying the backup failed would be a different claim, and a false one.
    test('does not call it a failure', () => {
      const status = app.vm.queries.syncStatusForIdentity(app.vm.identity)

      expect(status.status).toEqual('saved')
      expect(status.error).toEqual('')
      expect(status.at).toEqual(1700000000000)
    })

    test('stops saying it once a read works', async () => {
      const working = await mountApp({
        state: { abc123: { config: { syncStatus: 'saved', syncedAt: 1700000000000, checkError: 'AccessDenied' }, data: withS3 } },
        awsClient: s3Bucket({ answer: () => s3Response({ status: 200, body: '', headers: { etag: '"fresh"' } }) }).client
      })

      expect(working.vm.queries.syncStatusForIdentity(working.vm.identity).checkError).toEqual('')
    })

    // Nothing in the bucket yet is an answer, not a failure to get one.
    test('does not say it about a bucket that is simply empty', async () => {
      const empty = await mountApp({
        state: { abc123: { config: { syncStatus: 'saved', syncedAt: 1700000000000 }, data: withS3 } },
        awsClient: s3Bucket().client
      })

      expect(empty.vm.queries.syncStatusForIdentity(empty.vm.identity).checkError).toEqual('')
    })

    test('keeps it out of the log, like the rest of what one device knows', () => {
      expect(app.vm.queries.eventsToFile(app.vm.identity)).not.toContain('checkError')
      expect(app.vm.state.getConfig('abc123').checkError).toBeTruthy()
    })
  })
})
