import fs from 'fs'
import path from 'path'

const vueFilesIn = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const file = path.join(dir, entry.name)

  if (entry.isDirectory()) return vueFilesIn(file)

  return file.endsWith('.vue') ? [file] : []
})

// The app is one phone-wide column. In a window wider than that, anything as
// wide as the column has to sit in the middle with it, or the page looks cut
// off at the right.
describe('the column', () => {
  it('sits in the middle of a wide window, with everything laid over it', () => {
    const offCentre = vueFilesIn(__dirname).flatMap((file) => {
      const classes = fs.readFileSync(file, 'utf8').match(/class="[^"]*\bw-full max-w-app\b[^"]*"/g) || []

      return classes.filter((c) => !/\bmx-auto\b/.test(c) || /\bleft-0\b/.test(c)).map((c) => `${path.relative(__dirname, file)}: ${c}`)
    })

    expect(offCentre).toEqual([])
  })
})
