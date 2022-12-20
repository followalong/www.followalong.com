export default (a, b) => {
  if (a.updatedAt < b.updatedAt) return -1
  if (a.updatedAt > b.updatedAt) return 1
  return 0
}
