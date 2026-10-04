import { mountApp, describe, story, vi, s3Bucket, s3Response } from './helper.js'

const seed = `
  0/identities/abc123/create/v2.1 {"name":"My Account"}
  1/feeds/543/create/v2.1 {"url":"https://foo.bar/rss.xml","data":{"title":"Feed title"}}
  2/entries/keep/create/v2.1 {"feedId":"543","data":{"guid":"1","title":"Kept entry"}}
  3/entries/drop/create/v2.1 {"feedId":"543","data":{"guid":"2","title":"Ordinary entry"}}
  4/entries/keep/save/v2.1
`

const S3 = JSON.stringify({
  type: 'S3Adapter',
  data: { bucket: 'my-bucket', region: 'us-east-1', accessKeyId: 'AKIAEXAMPLE', secretAccessKey: 'secret' }
})

const OTHER = { other9: { config: {}, data: '0/identities/other9/create/v2.1 {"name":"Other"}' } }

describe('Move my feeds with a file', () => {
  let app
  let saveFile

  const saved = () => saveFile.mock.calls[saveFile.mock.calls.length - 1]

  const save = async (password) => {
    await app.click('[aria-label="Save identity to a file"]')
    if (password) await app.find('[aria-label="Password for the new file"]').setValue(password)
    await app.click('[aria-label="Save the file"]')
    await app.until(() => saveFile.mock.calls.length)
  }

  const open = async (device, text, password) => {
    await device.click('[aria-label="You"]')
    await device.click('[aria-label="Open identity from a file"]')
    await device.chooseFile('[aria-label="Choose a copy"]', text)
    if (password) await device.find('[aria-label="Password for the file"]').setValue(password)
    await device.click('[aria-label="Add the copy"]')
    await device.until(() => device.vm.identity.id === 'abc123' || /That |Enter /.test(device.text()))
  }

  beforeEach(async () => {
    saveFile = vi.fn(() => Promise.resolve(true))
    app = await mountApp({ saveFile, state: { abc123: { config: {}, data: seed } } })

    await app.click('[aria-label="You"]')
  })

  describe('saving without a password', () => {
    story('says anyone who has the file can read it', async () => {
      await app.click('[aria-label="Save identity to a file"]')

      expect(app.text()).toContain('Without a password, anyone who has the file can read it.')
      expect(app.text()).not.toContain('keys to your storage')
    })

    story('names the file for the identity and the day', async () => {
      await save()

      expect(saved()[0]).toMatch(/^my-account-\d{4}-\d{2}-\d{2}\.followalong$/)
    })

    story('saves what Copy this identity copies', async () => {
      await save()

      expect(saved()[1]).toEqual(app.vm.commands.portableIdentity(app.vm.identity))
      expect(saved()[1]).toContain('entries/keep/create')
      expect(saved()[1]).not.toContain('entries/drop')
    })

    story('says it is saved', async () => {
      await save()

      expect(app.find('[aria-label="Save identity to a file"]').text()).toContain('Saved')
    })

    story('opens on another device', async () => {
      await save()

      const other = await mountApp({ state: OTHER })

      await open(other, saved()[1])

      expect(other.vm.identity.id).toEqual('abc123')
      expect(other.vm.queries.feedsForIdentity(other.vm.identity).map((f) => f.data.title)).toContain('Feed title')
    })
  })

  describe('saving with a password', () => {
    story('saves a file nobody can read without it', async () => {
      await save('open sesame')

      expect(saved()[1]).toMatch(/^fa2:/)
      expect(saved()[1]).not.toContain('Feed title')
    })

    story('opens on another device with the password', async () => {
      await save('open sesame')

      const other = await mountApp({ state: OTHER })

      await open(other, saved()[1], 'open sesame')

      expect(other.vm.identity.id).toEqual('abc123')
    })

    story('says so when the password is wrong, and adds nothing', async () => {
      await save('open sesame')

      const other = await mountApp({ state: OTHER })

      await open(other, saved()[1], 'open says me')

      expect(other.text()).toContain('That password does not open this file.')
      expect(other.vm.queries.allIdentities()).toHaveLength(1)
    })

    story('asks for the password when none is given', async () => {
      await save('open sesame')

      const other = await mountApp({ state: OTHER })

      await open(other, saved()[1])

      expect(other.text()).toContain('Enter the password for this file.')
      expect(other.vm.queries.allIdentities()).toHaveLength(1)
    })
  })

  describe('a file that cannot be saved', () => {
    story('says why and keeps the sheet open', async () => {
      saveFile.mockImplementation(() => Promise.reject(new Error('This device could not save the file.')))

      await save()

      expect(app.text()).toContain('This device could not save the file.')
      expect(app.find('[aria-label="Save the file"]').exists()).toBe(true)
    })

    story('says nothing when the reader backs out', async () => {
      saveFile.mockImplementation(() => Promise.resolve(false))

      await save()

      expect(app.find('[aria-label="Save identity to a file"]').text()).not.toContain('Saved')
    })
  })

  describe('opening a file', () => {
    story('refuses an empty file', async () => {
      await open(app, '  \n')

      expect(app.text()).toContain('That file is empty.')
    })

    story('refuses a file that is not a copy', async () => {
      await open(app, '<opml><body /></opml>')

      expect(app.text()).toContain('That file is not a Follow Along copy.')
      expect(app.vm.queries.allIdentities()).toHaveLength(1)
    })

    story('refuses an identity that is already on this device', async () => {
      await save()
      await open(app, saved()[1])

      expect(app.text()).toContain('That identity is already on this device.')
      expect(app.vm.queries.allIdentities()).toHaveLength(1)
    })

    story('asks for a file when none is chosen', async () => {
      await app.click('[aria-label="Open identity from a file"]')
      await app.click('[aria-label="Add the copy"]')

      expect(app.text()).toContain('Choose a file first.')
    })

    story('asks for no password when the file has none', async () => {
      await app.click('[aria-label="Open identity from a file"]')
      await app.chooseFile('[aria-label="Choose a copy"]', seed)

      expect(app.find('[aria-label="Password for the file"]').exists()).toBe(false)
    })
  })

  describe('with no backup', () => {
    story('the another-device sheet suggests the file first, then copy and paste', async () => {
      await app.click('[aria-label="Another device"]')

      const text = app.text()

      expect(text).toContain('Or use Save a copy to a file here, then Open a copy from a file on the other device.')
      expect(text).toContain('Copy this identity and Paste an identity do the same through the clipboard.')
      expect(text.indexOf('Save a copy to a file here')).toBeLessThan(text.indexOf('Copy this identity and Paste'))
    })
  })
})

describe('Move my feeds with a file, from a device that syncs to its own storage', () => {
  let app
  let saveFile

  beforeEach(async () => {
    saveFile = vi.fn(() => Promise.resolve(true))

    app = await mountApp({
      saveFile,
      awsClient: s3Bucket({ answer: () => s3Response({ body: '' }) }).client,
      state: { abc123: { config: {}, data: `${seed}\n  5/addons/s3addon/configure/v2.1 ${S3}` } }
    })

    await app.click('[aria-label="You"]')
    await app.click('[aria-label="Save identity to a file"]')
  })

  story('says the file holds the keys to the storage', () => {
    expect(app.text()).toContain('The file holds the keys to your storage at my-bucket.')
    expect(app.text()).toContain('Without a password, anyone who has the file can read it and use those keys.')
  })

  story('saves the keys, so the other device keeps syncing', async () => {
    await app.click('[aria-label="Save the file"]')

    expect(saveFile.mock.calls[0][1]).toContain('AKIAEXAMPLE')
  })
})
