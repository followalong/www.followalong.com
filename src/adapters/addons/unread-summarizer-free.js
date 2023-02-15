import summarize from './summarizer.js'
import Adapter from './adapter.js'

const MAX_STORIES = 5
const SIGNAL_NAME = 'Summarizer'

const getPermalink = (str) => {
  return str
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-*|-*$/g, '')
    .toLowerCase()
}

class Summarizer extends Adapter {
  constructor (adapterOptions, addonData) {
    addonData.data = addonData.data || {}
    addonData.data.maxStories = parseInt(addonData.data.maxStories || MAX_STORIES)
    addonData.data.signalTitle = addonData.data.signalTitle || SIGNAL_NAME

    super(adapterOptions, addonData)

    this.title = 'Unread Summarizer (Free)'
    this.description = 'Having trouble staying on top of all your feeds? Our simple summarizing algorithm groups and condenses new entries to give you a zipped-up, high-potency low-down. It shows the related entries and gives you a chance to mark them all as "Done" in one click. To configure, set the maximum number of stories you want to see in the new Signal.'
    this.preview = `Adds "${this.data.signalTitle}", which summarizes ${this.data.feeds || 'your'} feeds into ${this.data.maxStories} stor${this.data.maxStories === 1 ? 'y' : 'ies'}`
    this.fields = {
      signalTitle: {
        type: 'text',
        label: 'Name of Signal',
        required: true,
        placeholder: SIGNAL_NAME,
        min: 1
      },
      maxStories: {
        type: 'number',
        label: 'Maximum number of stories',
        required: true,
        placeholder: MAX_STORIES,
        min: 1
      }
    }
  }

  validate (data) {
    return true
  }

  signals () {
    const data = this.data

    return [{
      data: {
        title: this.data.signalTitle,
        permalink: getPermalink(this.data.signalTitle),
        description: `A summary of ${this.data.feeds || 'your'} feeds into ${this.data.maxStories} stor${this.data.maxStories === 1 ? 'y' : 'ies'}`,
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5 flex-shrink-0 text-gray-300 mr-3"><path fill-rule="evenodd" d="M4.125 3C3.089 3 2.25 3.84 2.25 4.875V18a3 3 0 003 3h15a3 3 0 01-3-3V4.875C17.25 3.839 16.41 3 15.375 3H4.125zM12 9.75a.75.75 0 000 1.5h1.5a.75.75 0 000-1.5H12zm-.75-2.25a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5H12a.75.75 0 01-.75-.75zM6 12.75a.75.75 0 000 1.5h7.5a.75.75 0 000-1.5H6zm-.75 3.75a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5H6a.75.75 0 01-.75-.75zM6 6.75a.75.75 0 00-.75.75v3c0 .414.336.75.75.75h3a.75.75 0 00.75-.75v-3A.75.75 0 009 6.75H6z" clip-rule="evenodd" /><path d="M18.75 6.75h1.875c.621 0 1.125.504 1.125 1.125V18a1.5 1.5 0 01-3 0V6.75z" /></svg>'
      },
      cards (entryContents) {
        const summaries = summarize(entryContents)

        return summaries
          .map((summary) => {
            const card = {
              title: summary.sentencesByPotency[0].content
            }

            if (summary.sentencesByWeight.length) {
              card.content = `
                <ul>
                  ${summary.sentencesByWeight.map((sentence) => {
                    return `<li>${sentence.content}</li>`
                  }).join('')}
                </ul>
              `
            }

            return card
          })
          .filter((card) => card.content)
          .slice(0, data.maxStories)
      }
    }]
  }
}

export default Summarizer
