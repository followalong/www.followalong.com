export default (queries) => {
  return (a, b) => {
    if (queries.titleForFeed(a) < queries.titleForFeed(b)) return -1
    if (queries.titleForFeed(a) > queries.titleForFeed(b)) return 1
    return 0
  }
}
