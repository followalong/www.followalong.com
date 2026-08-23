/* eslint-disable no-console */

// Builds a publishable copy of the app and checks it is actually publishable.
//
// It does not push anywhere. The previous version force-pushed the working
// tree to a gh-pages branch, which meant deploying was the same action as
// publishing, from whatever branch happened to be checked out, with no way to
// look at the result first. This produces the directory and leaves putting it
// somewhere to you.

const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const target = path.join(root, 'dist')

const run = (command, args) => {
  execFileSync(command, args, { cwd: root, stdio: 'inherit' })
}

const build = () => {
  console.log('🔨 Building…')

  fs.rmSync(target, { recursive: true, force: true })
  run('npx', ['vite', 'build'])
}

// Deep links are real URLs here — a feed lives at /https://example.com/feed.xml
// — so any host has to answer unknown paths with the app itself. Most static
// hosts do that from a 404.html; the ones that do not need a rewrite rule,
// which is what the notes below are for.
const addFallback = () => {
  fs.copyFileSync(path.join(target, 'index.html'), path.join(target, '404.html'))

  // Pages still runs the legacy Jekyll builder over this repo. Without this it
  // tries to process the bundle output and the build fails — and a failed
  // build takes the live site down rather than leaving the last one up.
  fs.writeFileSync(path.join(target, '.nojekyll'), '')
}

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true })
  .reduce((files, entry) => {
    const full = path.join(dir, entry.name)

    return files.concat(entry.isDirectory() ? walk(full) : [full])
  }, [])

const verify = () => {
  console.log('🔍 Checking the build…')

  const problems = []
  const indexPath = path.join(target, 'index.html')

  if (!fs.existsSync(indexPath)) {
    problems.push('dist/index.html is missing — the build produced nothing')
    return problems
  }

  // Commented-out tags are not references; index.html carries a few.
  const html = fs.readFileSync(indexPath, 'utf8').replace(/<!--[\s\S]*?-->/g, '')
  const referenced = [...html.matchAll(/(?:src|href)="(\/[^"]+)"/g)].map((m) => m[1])

  referenced.forEach((ref) => {
    if (!fs.existsSync(path.join(target, ref))) {
      problems.push(`index.html points at ${ref}, which is not in dist`)
    }
  })

  if (!referenced.some((ref) => ref.endsWith('.js'))) {
    problems.push('index.html loads no JavaScript bundle')
  }

  if (!referenced.some((ref) => ref.endsWith('.css'))) {
    problems.push('index.html loads no stylesheet')
  }

  if (!fs.existsSync(path.join(target, '404.html'))) {
    problems.push('404.html is missing — deep links would not resolve')
  }

  if (!fs.existsSync(path.join(target, '.nojekyll'))) {
    problems.push('.nojekyll is missing — Pages would fail the build and take the site down')
  }

  // The bundler dropped the S3 client out of the aws-sdk chunk once, and
  // nothing said so until a backup ran in a real browser. The client's API
  // version is the cheapest proof it is still in here.
  const bundled = walk(target)
    .filter((file) => file.endsWith('.js'))
    .some((file) => fs.readFileSync(file, 'utf8').includes('2006-03-01'))

  if (!bundled) {
    problems.push('no S3 client in the build — every backup would fail at runtime')
  }

  return problems
}

const summarise = () => {
  const bytes = (dir) => fs.readdirSync(dir, { withFileTypes: true })
    .reduce((total, entry) => {
      const full = path.join(dir, entry.name)

      return total + (entry.isDirectory() ? bytes(full) : fs.statSync(full).size)
    }, 0)

  const mb = (bytes(target) / 1024 / 1024).toFixed(2)

  console.log('')
  console.log(`✅ dist/ is ready — ${mb} MB`)
  console.log('')
  console.log('   Look at it first:   yarn preview')
  console.log('   Then publish dist/ to any static host.')
  console.log('')
  console.log('   Whatever you use must serve index.html for unknown paths,')
  console.log('   because a feed URL is part of the path. A 404.html fallback')
  console.log('   is included for hosts that use one.')
  console.log('')
}

Promise.resolve()
  .then(build)
  .then(addFallback)
  .then(verify)
  .then((problems) => {
    if (problems.length) {
      console.error('')
      console.error('❌ Not publishable:')
      problems.forEach((problem) => console.error(`   • ${problem}`))
      process.exit(1)
    }

    summarise()
  })
  .catch((e) => {
    console.error(e.message)
    process.exit(1)
  })
