import fs from 'fs'
import path from 'path'

const vueFilesIn = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const file = path.join(dir, entry.name)

  if (entry.isDirectory()) return vueFilesIn(file)

  return file.endsWith('.vue') ? [file] : []
})

// A route is a router-link. An `a` leaves the app, and the native shell hands
// only a target="_blank" link to the system browser: any other one loads over
// the app in its one webview, with no way back. A data-app-link is the other
// way round: a browser handing a followalong:// address to the native app,
// which a new tab would only get in the way of. The app never renders one.
describe('a link out of the app', () => {
  it('opens outside it', () => {
    const staying = vueFilesIn(__dirname).flatMap((file) => {
      const links = fs.readFileSync(file, 'utf8').match(/<a\s[^>]*>/g) || []

      return links.filter((a) => !a.includes('target="_blank"') && !a.includes('data-app-link')).map((a) => `${path.relative(__dirname, file)}: ${a}`)
    })

    expect(staying).toEqual([])
  })
})
