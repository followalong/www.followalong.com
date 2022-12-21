class Paste {
  constructor (data) {
    this.name = 'Paste'
    this.data = data
  }
}

Paste.NAME = 'Paste a configuration'
Paste.FIELDS = {
  paste: {
    type: 'textarea',
    label: 'Paste your configuration',
    required: true
  }
}

export default Paste
