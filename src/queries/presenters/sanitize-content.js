export default (s) => {
  // s = new DOMParser().parseFromString(s, 'text/html').documentElement.textContent

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
    $els[i].removeAttribute('style')
    $els[i].removeAttribute('width')
    $els[i].removeAttribute('height')
    $els[i].removeAttribute('class')
  }

  const $as = div.querySelectorAll('a')

  for (i = $as.length - 1; i >= 0; i--) {
    $as[i].target = '_blank'
  }

  return div.innerHTML
}
