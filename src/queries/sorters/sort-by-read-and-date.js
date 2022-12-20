export default (date) => {
  if (!date) {
    date = 'pubDate'
  }

  return (a, b) => {
    if (date !== '_updatedAt') {
      if (!a.readAt && b.readAt) return -1
      if (a.readAt && !b.readAt) return 1

      if (typeof a[date] !== 'object') {
        a[date] = new Date(a[date])
      }

      if (typeof b[date] !== 'object') {
        b[date] = new Date(b[date])
      }
    }

    if (a[date] > b[date]) return -1
    if (a[date] < b[date]) return 1

    return 0
  }
}
