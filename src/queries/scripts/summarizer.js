const IMPORTANT_WORD_LENGTH = 5
const MAX_KEYWORD_SUMMARIES = 4

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

const pluralize = (word) => {
  if (word[word.length - 1] === 's') {
    return word
  }

  return word
    .replace(/s$/, 'ses')
    .replace(/ay$/, 'ays')
    .replace(/y$/, 'ies')
    .replace(/o$/, 'oes')
    .replace(/x$/, 'xes')
    .replace(/[abcdefghjklmnpqrtvwz]$/, (letter) => letter + 's')
}

const simplifyWord = (word) => {
  return pluralize(
    word
      .replace(/[\W_-]+/g, ' ')
      .trim()
  )
}

const findSentences = (chars) => {
  let currentSentence = ''
  const sentences = []

  const reset = () => {
    sentences.push(currentSentence)
    currentSentence = ''
  }

  for (var i = 0; i < chars.length; i++) {
    const char = chars[i]
    const nextChar = chars[i + 1]
    const nextNextChar = chars[i + 2]

    if (char === '\n') {
      reset()
      continue
    }

    currentSentence += char

    if (
      (
        char === '.' ||
        char === '!' ||
        char === '?'
      ) &&
      (
        nextChar === ' '
      ) &&
      (
        /[A-Z"”]/.test(nextNextChar)
      )
    ) {
      reset()
      continue
    }
  }

  sentences.push(currentSentence)

  return sentences
    .filter((sentence) => sentence.length > 0)
    .map((sentence) => sentence.trim())
}

const FILTER_UNIQUE = (item, index, arr) => arr.indexOf(item) === index

const uniqueByContent = (arr) => {
  const contents = arr.map((item) => item.content)

  return arr
    .filter((item, index) => contents.indexOf(item.content) === index)
}

class Article {
  constructor (content) {
    this.content = content
    this.sentences = findSentences(content).map((sentence) => new Sentence(this, sentence))
  }

  getWords () {
    return this.sentences.reduce((arr, sentence) => {
      return arr.concat(sentence.getWords())
    }, [])
  }

  summary (potent = 2, important = 3) {

  }
}

class Sentence {
  constructor (article, content) {
    this.content = content
    this.article = article
  }

  getWords () {
    return this.content
      .split(/\s+?/)
      .filter((word) => isNaN(word))
      .filter((word) => word.length > IMPORTANT_WORD_LENGTH)
      .map((word) => simplifyWord(word))
  }

  getWeight (keywordMap) {
    let weight = 0

    this.getWords()
      .forEach((word) => {
        weight += keywordMap[word] ? keywordMap[word] * keywordMap[word] : 0
      })

    return weight
  }

  getPotency (keywordMap) {
    const words = this.getWords()
    let weight = 0

    words
      .forEach((word) => {
        weight += keywordMap[word] ? keywordMap[word] * keywordMap[word] : 0
      })

    return weight / words.length
  }
}

class ArticleGroup {
  constructor (articles) {
    this.articles = articles.map((content) => new Article(content))
  }

  findKeywords () {
    const counter = {}

    this.articles.forEach((article) => {
      article.getWords()
        .forEach((wordContent) => {
          counter[wordContent] = counter[wordContent] || 0
          counter[wordContent] += 1
        })
    })

    return sortByValue(counter)
  }

  getSentences () {
    return this.articles.reduce((arr, article) => {
      return arr.concat(article.sentences)
    }, [])
  }

  keywordSummary (keyword, keywordMap) {
    const sentencesWithKeyword = uniqueByContent(
      this.getSentences()
        .filter((sentence) => sentence.getWords().indexOf(keyword) !== -1)
    )

    const sentencesByPotency = sentencesWithKeyword.slice(0).sort((a, b) => {
      return b.getPotency(keywordMap) - a.getPotency(keywordMap)
    })
    const sentencesByWeight = sentencesWithKeyword.slice(0).sort((a, b) => {
      return b.getWeight(keywordMap) - a.getWeight(keywordMap)
    })

    return {
      keyword,
      summary: 'Summary',
      sentencesByPotency: sentencesByPotency.slice(0, 1),
      sentencesByWeight: sentencesByWeight.slice(0, 3),
      relatedArticles: sentencesWithKeyword
        .reduce((arr, sentence) => arr.concat(sentence.article.content), [])
        .filter(FILTER_UNIQUE)
    }
  }

  summary () {
    const keywordSummaries = []
    const keywordMap = this.findKeywords()

    let relatedArticles = []

    for (const keyword in keywordMap) {
      const keywordSummary = this.keywordSummary(keyword, keywordMap)

      if (relatedArticles.indexOf(keywordSummary.relatedArticles[0]) === -1) {
        relatedArticles = relatedArticles.concat(keywordSummary.relatedArticles)
        keywordSummaries.push(keywordSummary)
      }

      if (keywordSummaries.length >= MAX_KEYWORD_SUMMARIES) {
        break
      }
    }

    return keywordSummaries
  }
}

export default (articles) => {
  const articleGroup = new ArticleGroup(articles)
  const summary = articleGroup.summary()

  return summary
}
