export default (s) => {
  var div = document.createElement('div')
  var scripts; var i

  div.innerHTML = s

  scripts = div.getElementsByTagName('script')

  for (i = scripts.length - 1; i >= 0; i--) {
    scripts[i].parentNode.removeChild(scripts[i])
  }

  scripts = div.getElementsByTagName('style')

  for (i = scripts.length - 1; i >= 0; i--) {
    scripts[i].parentNode.removeChild(scripts[i])
  }

  const $els = div.querySelectorAll('*')

  for (i = $els.length - 1; i >= 0; i--) {
    $els[i].style = ''
    $els[i].removeAttribute('width')
    $els[i].removeAttribute('height')
  }

  return div.innerHTML
    .replace(/target=['"]?[^"']+['"\s>]?/g, '')
    .replace(/<a([^>]+)>?/g, '<a$1 target="_blank">')
}
