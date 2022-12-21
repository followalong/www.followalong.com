const QUOTES = [{
  content: 'Progress is impossible without change, and those who cannot change their minds cannot change anything.',
  author: 'George Bernard Shaw'
}, {
  content: 'Small progress is still progress.',
  author: 'Anonymous'
}, {
  content: 'If there is no struggle, there is no progress.',
  author: 'Frederick Douglass'
}, {
  content: 'Little by little becomes a lot.',
  author: 'Anonymous'
}, {
  content: 'Passion. Purpose. Progress.',
  author: 'Anonymous'
}, {
  content: 'A little progress every day adds up to big results.',
  author: 'Satya'
}, {
  content: 'Strive for progress, not perfection.',
  author: 'Anonymous'
}, {
  content: 'Don\'t compare your progress to that of others. We need our own time to travel our own distance.',
  author: 'Anonymous'
}, {
  content: 'Progress is not in enhancing what is, but in advancing toward what will be.',
  author: 'Khalil Gibran'
}, {
  content: 'Without deviation from the norm, progress is not possible.',
  author: 'Frank Zappa'
}, {
  content: 'Courage means to keep making forward progress while you still feel afraid.',
  author: 'Joyce Meyer'
}, {
  content: 'Always be a work in progress.',
  author: 'Emily Lillian'
}, {
  content: 'Slow, steady progress is better than daily excuses.',
  author: 'Robin Sharma'
}, {
  content: 'Human progress is neither automatic nor inevitable. Every step toward the goals requires sacrifice, suffering, and struggle; the tireless exertions and passionate concern of dedicated individuals.',
  author: 'Martin Luther King'
}, {
  content: 'Success is steady progress toward one\'s personal goals.',
  author: 'Jim Rohn'
}, {
  content: 'Work hard for you and your own goals. Progress will come.',
  author: 'Anonymous'
}, {
  content: 'Progress is not inevitable. It\'s up to us to create it.',
  author: 'Anonymous'
}, {
  content: 'Failure is success in progress.',
  author: 'Albert Einstein'
}, {
  content: 'Allow yourself to be proud of yourself and all the progress you\'ve made. Especially the progress that no one else can see.',
  author: 'Anonymous'
}, {
  content: 'Comfort is the enemy of progress.',
  author: 'P. T. Barnum'
}, {
  content: 'Make measurable progress in reasonable time.',
  author: 'Jim Rohn'
}, {
  content: 'Never discourage anyone who continually makes progress, no matter how slow.',
  author: 'Plato'
}, {
  content: 'Some quit due to slow progress. Never grasping the fact that slow progress is progress.',
  author: 'Jeff Olson'
}, {
  content: 'Consider what a long way you\'ve come.',
  author: 'Anonymous'
}, {
  content: 'A lack of focus leads to a lack of progress. Focus. Grind. Grow.',
  author: 'Anonymous'
}, {
  content: 'Do not confuse motion and progress. A rocking horse keeps moving but does not make any progress.',
  author: 'Alfred A. Montapert'
}, {
  content: 'Whatever you do, you have to keep moving forward.',
  author: 'Martin Luther King'
}, {
  content: 'Progress always involves risks. You can\'t steal second base and keep your foot on first.',
  author: 'Frederick B. Wilcox'
}, {
  content: 'The moment a man ceases to progress, to grow higher, wider and deeper, then his life becomes stagnant.',
  author: 'Orison S. Marden'
}, {
  content: 'Without continual growth and progress, such words as improvement, achievement, and success have no meaning.',
  author: 'Benjamin Franklin'
}, {
  content: 'All progress takes place outside the comfort zone.',
  author: 'Michael John Bobak'
}, {
  content: 'If you want to experience significant progress toward your goal, you need to be intentional about the work you\'re doing every day.',
  author: 'Anonymous'
}, {
  content: 'Delay is the enemy of progress.',
  author: 'Eliot Spitzer'
}, {
  content: 'All progress depends on the unreasonable man.',
  author: 'George Bernard Shaw'
}, {
  content: 'There are only two options: Make progress or make excuses.',
  author: 'Anonymous'
}, {
  content: 'When he took time to help the man up the mountain, lo, he scaled it himself.',
  author: 'Tibetan Proverb'
}]

class Quote {
  constructor () {
    const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)]

    this.content = quote.content
    this.author = quote.author
  }
}

export default Quote
