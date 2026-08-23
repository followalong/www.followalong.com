import { mountApp, describe, story, vi } from './helper.js'

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
        awsS3: () => Promise.resolve({
          putObject: (params, cb) => { save(params); cb(null) },
          getObject: (params, cb) => cb(new Error('no data'))
        })
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

  describe('When the remote refuses', () => {
    let app

    beforeEach(async () => {
      app = await mountApp({
        state: { abc123: { config: {}, data: withS3 } },
        awsS3: () => Promise.resolve({
          putObject: (params, cb) => cb(new Error('Access denied')),
          getObject: (params, cb) => cb(new Error('no data'))
        })
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
})
