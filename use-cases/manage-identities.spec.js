import { mountApp, describe, story, event } from './helper.js'

describe('Manage identities', () => {
  let app

  beforeEach(async () => {
    app = await mountApp({
      state: {
        abc123: {
          config: {},
          data: '0/identities/abc123/create/v2.1 {"name":"My Account"}'
        }
      }
    })

    await app.click('[aria-label="You"]')
  })

  story('names the identity you are using', () => {
    expect(app.text()).toContain('My Account')
  })

  describe('Renaming it', () => {
    beforeEach(async () => {
      await app.click('[aria-label="Rename identity"]')
      await app.find('[aria-label="Identity name"]').setValue('Work')
      await app.submit('[aria-label="Save identity name"]')
    })

    story('shows the new name', () => {
      expect(app.vm.queries.nameForIdentity(app.vm.identity)).toEqual('Work')
    })

    event('identities.update', {
      objectId: 'abc123',
      data: { name: 'Work' }
    }, () => { return { app } })
  })

  describe('Adding another', () => {
    beforeEach(async () => {
      await app.click('[aria-label="Switch identity"]')
      await app.click('[aria-label="Add identity"]')
    })

    story('keeps both', () => {
      expect(app.vm.queries.allIdentities()).toHaveLength(2)
    })

    story('switches to the new one', () => {
      expect(app.vm.identity.id).not.toEqual('abc123')
    })

    describe('Switching back', () => {
      beforeEach(async () => {
        await app.click('[aria-label="You"]')
        await app.click('[aria-label="Switch identity"]')
        await app.click('[aria-label="Switch to My Account"]')
      })

      story('uses the original again', () => {
        expect(app.vm.identity.id).toEqual('abc123')
      })
    })
  })
})
