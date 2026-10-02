export default (s) => {
  const div = document.createElement('div')

  div.innerHTML = s

  // meta and base send the whole page elsewhere without a click.
  div.querySelectorAll('script, style, meta, base').forEach(($el) => $el.remove())

  div.querySelectorAll('*').forEach(($el) => {
    $el.removeAttribute('style')
    $el.removeAttribute('width')
    $el.removeAttribute('height')
    $el.removeAttribute('class')
  })

  // Whatever leaves, leaves the app: the native shell has one webview.
  div.querySelectorAll('a, area, form').forEach(($el) => { $el.target = '_blank' })

  return div.innerHTML
}
