import Adapter from './adapter.js'

const SPACE = /\s+/gm

const findPotentSentences = (sentences, tokens) => {
  return sentences
    .map((content) => {
      const words = content.split(SPACE).filter((w) => w.length > 5).map(normalizeWord)
      let score = 0

      words.forEach((word) => {
        if (tokens[word]) {
          score += tokens[word]
        }
      })

      return { content, score: score / words.length }
    })
    .sort((a, b) => b.score - a.score)
    .map((sentence) => sentence.content.trim())
}

const findImportantSentences = (sentences, tokens) => {
  return sentences
    .map((content) => {
      const words = content.split(SPACE).filter((w) => w.length > 5).map(normalizeWord)
      let score = 0

      words.forEach((word) => {
        if (tokens[word]) {
          score += tokens[word]
        }
      })

      return { content, score }
    })
    .sort((a, b) => b.score - a.score)
    .map((sentence) => sentence.content)
}

const normalizeWord = (word) => {
  if (word[word.length - 1] === 's') {
    return word
  }

  return word
    .replace(/s$/, 'ses')
    .replace(/ay$/, 'ays')
    .replace(/y$/, 'ies')
    .replace(/o$/, 'oes')
    .replace(/x$/, 'xes')
    .replace(/[^\w\d]+/g, '')
    .replace(/[abcdefghjklmnpqrtvwz]$/, (letter) => `${letter}s`)
    .trim()
}

const sortByValue = (obj) => {
  const newObj = {}
  const sortable = []

  for (const key in obj) {
    sortable.push([key, obj[key]])
  }

  sortable.sort((a, b) => {
    return b[1] - a[1]
  })

  sortable.slice(0, 15).forEach((item) => {
    newObj[item[0]] = item[1]
  })

  return newObj
}

const sumTokenWeights = (tokens) => {
  const weights = {}

  tokens.forEach((token) => {
    weights[token] = weights[token] || 0
    weights[token] += 1
  })

  return sortByValue(weights)
}

class EntrySummarizer extends Adapter {
  constructor (adapterOptions, addonData) {
    addonData.data = addonData.data || {}

    super(adapterOptions, addonData)

    this.title = 'Entry Summarizer (Free)'
    this.description = 'Having trouble staying on top of all your feeds? Our simple summarizing algorithm pulls out the most important sentences in an entry to give you a zipped-up, high-potency low-down.'
    this.preview = 'Provides a summary of each entry'
    this.fields = {}
  }

  validate (data) {
    return true
  }

  entryMeta (entry, helpers) {
    const input = helpers.contentForEntry(entry)

    if (!input || input.length < 100) {
      return
    }

    const content = new DOMParser().parseFromString(input, 'text/html').documentElement.textContent
    const tokens = content.split(SPACE).map(normalizeWord).filter((w) => w.length > 5)
    const tokenWeights = sumTokenWeights(tokens)
    const sentences = content.match(/[^.!?\n]+[.!?\n]/g).filter((s) => s.length > 5)
    const potentSentences = findPotentSentences(sentences, tokenWeights)
    const mostImportant = potentSentences.shift()
    const importantSentences = findImportantSentences(sentences, tokenWeights).filter((s) => s !== mostImportant)

    return {
      content: [
        `<strong>${mostImportant}</strong>`,
        '<ul>',
        importantSentences.slice(0, 3).map((s) => `<li>${s}</li>`).join(''),
        '</ul>'
      ]
        .join(' ')
    }
  }
}

export default EntrySummarizer
