export default (a, b) => {
  return parseInt(typeof a.data.order !== 'undefined' ? a.data.order : 100) - parseInt(typeof b.data.order !== 'undefined' ? b.data.order : 100)
}
