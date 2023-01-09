export default (queries) => {
  return (a, b) => {
    return `${a.name}`.localeCompare(`${b.name}`)
  }
}
