export default (queries) => {
  return (a, b) => {
    if (queries.lastUpdatedForFeed(a) < queries.lastUpdatedForFeed(b)) return -1
    if (queries.lastUpdatedForFeed(a) > queries.lastUpdatedForFeed(b)) return 1
    return 0
  }
}
