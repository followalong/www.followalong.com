export default (a, b) => {
  if ((a.time || a.createdAt) < (b.time || b.createdAt)) return 1
  if ((a.time || a.createdAt) > (b.time || b.createdAt)) return -1
  return 0
}
