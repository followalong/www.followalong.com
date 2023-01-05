export default (queries) => {
  return (a, b) => {
    if (queries.dateForEntry(a).getTime() < queries.dateForEntry(b).getTime()) return 1
    if (queries.dateForEntry(b).getTime() < queries.dateForEntry(a).getTime()) return -1
    return 0
  }
}
