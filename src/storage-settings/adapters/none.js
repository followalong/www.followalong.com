class None {
  constructor (data) {
    this.name = 'None'
    this.data = data
  }

  fetch () {
    return Promise.resolve()
  }

  put () {
    return Promise.resolve()
  }
}

None.NAME = 'None'
None.FIELDS = []

export default None
