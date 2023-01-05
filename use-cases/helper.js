/* eslint no-async-promise-executor: 0 */

import { mount, flushPromises } from '@vue/test-utils'
import { vi, describe, test } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'
import { routes } from '../src/app/router/index.js'
import runners from '../src/state/runners.js'
import MultiEventStore from '../src/state/multi-event-store.js'
import App from '../src/app/component.vue'
// import KeychainAdapter from '../adapters/keychain.js'
// import LocalAddonAdapter from '../adapters/addons/local.js'
// import { passThrough } from '../queries/helpers/crypt.js'
// import Queries from '../src/queries/index.js'

// class AWSEndpoint {
//   constructor (url) {
//     this.url = url
//   }
// }
//
// class AWSLambda {
//   invoke (data, done) {
//     done(new Error('Request is not stubbed'))
//   }
// }

const mountApp = (options) => {
  return new Promise(async (resolve) => {
    options = options || {}

    // const addonAdapterOptions = options.addonAdapterOptions || {}
    // addonAdapterOptions.fetch = addonAdapterOptions.fetch || vi.fn(() => Promise.resolve())

    //     const keychainAdapter = new KeychainAdapter({
    //       prompt: vi.fn(() => 'abc-123')
    //     })
    //
    //     await keychainAdapter.db.clear()

    // if (options.keychainAdapterData) {
    //   for (const key in options.keychainAdapterData) {
    //     if (key === 'storedKeys') {
    //       for (const a in options.keychainAdapterData[key]) {
    //         await keychainAdapter.db.setItem(a, options.keychainAdapterData[key][a])
    //       }
    //     } else {
    //       keychainAdapter[key] = options.keychainAdapterData[key]
    //     }
    //   }
    // }

    const store = new MultiEventStore('follow-along', 'v2.1', runners)

    await store.reset()

    if (options.state) {
      for (const id in options.state) {
        const identity = options.state[id]

        store.createDB(id, identity.config)
        await store.importRaw(id, identity.data)
      }
    }

    const router = createRouter({
      history: createMemoryHistory(),
      routes
    })

    router.push(options.path || '/')

    await router.isReady()

    const app = await mount(App, {
      global: {
        plugins: [router]
      },
      propsData: {
        fetch: options.fetch || vi.fn().mockResolvedValue(''),
        state: store
        // keychainAdapter,
        // addonAdapterOptions,
        // noAutomaticFetches: true,
        // window: { scrollTo: () => {} }
      }
    })

    app.click = async (el) => {
      let $el = null

      try {
        $el = await app.find(el)
      } catch (e) { }

      if (!$el) {
        throw new Error(`Could not find element: ${el} in ${app.text()}`)
      }

      await $el.trigger('click')
      await app.wait()
    }

    app.submit = async (el) => {
      let $el = null

      try {
        $el = await app.find(el)
      } catch (e) { }

      if (!$el) {
        throw new Error(`Could not find element: ${el} in ${app.text()}`)
      }

      await $el.trigger('submit')
      await app.wait()
    }

    app.wait = async () => {
      await flushPromisesAndTimers()
      await flushPromisesAndTimers()
    }

    app.getLocalDefaultIdentity = async () => {
      const ids = await app.vm.commands.keychainAdapter.getKeys()

      if (!ids.length) {
        return null
      }

      const identity = await app.vm.commands.getLocalIdentity(ids[0])

      return identity
    }

    //     app.buildAddonToRespondWith = (buildType, result) => {
    //       const fn = vi.fn(() => Promise.resolve(result))
    //
    //       return vi.fn((identity, type) => {
    //         if (type === buildType) {
    //           const addon = new LocalAddonAdapter()
    //
    //           addon[type] = fn
    //
    //           return addon
    //         } else {
    //           return new Queries().addonForIdentity(identity, type)
    //         }
    //       })
    //     }

    await app.wait()

    resolve(app)
  })
}

const rawRSSResponse = (item) => {
  return {
    status: 200,
    body: rawRSS(item)
  }
}

const rawRSS = (item) => {
  let enclosure = ''

  if (item.videoUrl) {
    enclosure = `<enclosure url="${item.videoUrl}"></enclosure>`
  }

  if (item.audioUrl) {
    enclosure = `<enclosure url="${item.audioUrl}"></enclosure>`
  }

  item.content = item.content || 'This is some random content'
  item.title = item.title || 'This is some random title'
  item.link = item.link || 'https://example.com'

  return `
  <?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0"
    xmlns:content="http://purl.org/rss/1.0/modules/content/"
    xmlns:wfw="http://wellformedweb.org/CommentAPI/"
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:atom="http://www.w3.org/2005/Atom"
    xmlns:sy="http://purl.org/rss/1.0/modules/syndication/"
    xmlns:slash="http://purl.org/rss/1.0/modules/slash/"

    xmlns:georss="http://www.georss.org/georss"
    xmlns:geo="http://www.w3.org/2003/01/geo/wgs84_pos#"
  >
  <channel>
    <title>Signal v. Noise</title>
    <atom:link href="https://m.signalvnoise.com/feed/" rel="self" type="application/rss+xml" />
    <link>https://m.signalvnoise.com</link>
    <description>Strong opinions and shared thoughts on design, business, and tech. By the makers (and friends) of &#60;a href=&#34;https://www.basecamp.com&#34; target=&#34;_blank&#34; rel=&#34;noopener&#34;&#62;Basecamp&#60;/a&#62;. Since 1999.</description>
    <lastBuildDate>Tue, 09 Feb 2021 18:04:31 +0000</lastBuildDate>
    <language>en-US</language>
    <sy:updatePeriod>hourly</sy:updatePeriod>
    <sy:updateFrequency>1</sy:updateFrequency>
    <image>
      <url>https://i1.wp.com/m.signalvnoise.com/wp-content/uploads/2019/01/cropped-svn-icon.gif?fit=32%2C32&#038;ssl=1</url>
      <title>Signal v. Noise</title>
      <link>https://m.signalvnoise.com</link>
      <width>32</width>
      <height>32</height>
    </image>
    <site xmlns="com-wordpress:feed-additions:1">156952158</site>
    <item>
      <title>${item.title}</title>
      <link>${item.link}</link>
      <dc:creator><![CDATA[DHH]]></dc:creator>
      <pubDate>${item.pubDate || 'Tue, 09 Feb 3000 18:04:30 +0000'}</pubDate>
      <category><![CDATA[Uncategorized]]></category>
      <guid isPermaLink="false">${item.guid || 'https://m.signalvnoise.com/?p=13077'}</guid>
      <description><![CDATA[Chairman Klein and members of the Senate Industry, Business and Labor Committee- My name is David Heinemeier Hansson, and I’m the CTO and co-founder of Basecamp, a small internet company from Chicago that sells project-management software and email addons. I first testified on the topic of big tech monopolies at the House Antitrust Subcommittee&#8217;s field&#8230; <a class="read-more" href="https://m.signalvnoise.com/testimony-before-the-north-dakota-senate-industry-business-and-labor-committee/">keep reading</a>]]></description>
      <content:encoded><![CDATA[${item.content}]]></content:encoded>
      <slash:comments>11</slash:comments>
      <post-id xmlns="com-wordpress:feed-additions:1">12956</post-id>
      ${enclosure}
      </item>
    </channel>
  </rss>
  `
}

vi.useFakeTimers()

const flushPromisesAndTimers = () => {
  vi.runAllTimers()
  return flushPromises()
}

const responses = (values) => {
  const fn = vi.fn()

  values.forEach((val) => fn.mockResolvedValueOnce(val))

  return fn
}

export {
  mountApp,
  rawRSSResponse,
  rawRSS,
  describe,
  test,
  responses
}
