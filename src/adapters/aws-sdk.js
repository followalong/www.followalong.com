import url from 'aws-sdk/dist/aws-sdk.min.js?url'

// The SDK's own prebuilt browser bundle, fetched as a script rather than
// imported. Importing the npm package let Rollup rewrite its CommonJS, and the
// rewrite ran one of its modules before the constructor that module needs had
// been assigned: `vite serve` was fine, every production build threw "e is not
// a constructor" on the first backup, and the S3 client was tree-shaken out of
// the chunk entirely. Nothing here is loaded until an identity syncs.
let loading = null

const loadAwsSdk = () => {
  if (loading) return loading

  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script')

    script.src = url
    script.onload = () => resolve(window.AWS)
    script.onerror = () => reject(new Error('Could not load the S3 library.'))

    document.head.appendChild(script)
  })

  return loading
}

export default loadAwsSdk
