// The alphabet as somebody reading it would expect. Comparing the strings
// directly ordered by character code, which puts every capital ahead of every
// lowercase letter, so a feed called "zebra" came before one called "Apple".
export default (queries) => {
  return (a, b) => {
    return `${queries.titleForFeed(a)}`.localeCompare(`${queries.titleForFeed(b)}`, undefined, {
      sensitivity: 'base',
      numeric: true
    })
  }
}
