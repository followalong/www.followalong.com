module.exports = {
  root: true,
  env: {
    node: true,
    jest: true
  },
  extends: [
    'plugin:vue/vue3-recommended',
    'standard'
  ],
  plugins: [
    'vue'
  ],
  parserOptions: {
    ecmaVersion: 11,
    sourceType: 'module'
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'vue/no-mutating-props': 0,
    'vue/no-v-html': 0,
    'vue/require-prop-types': 0,
    'vue/no-side-effects-in-computed-properties': 0,
    'no-fallthrough': 0,
    'handle-callback-err': 0
  }
}
