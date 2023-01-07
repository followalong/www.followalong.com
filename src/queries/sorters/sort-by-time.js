export default (queries) => {
  return (a, b) => {
    if (queries.isEntryRead(a) && !queries.isEntryRead(b)) return 1
    if (!queries.isEntryRead(a) && queries.isEntryRead(b)) return -1
    if (queries.dateForEntry(a).getTime() < queries.dateForEntry(b).getTime()) return 1
    if (queries.dateForEntry(b).getTime() < queries.dateForEntry(a).getTime()) return -1
    return 0
  }
}
