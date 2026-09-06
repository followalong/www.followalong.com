// An item a feed gave us no way to identify. Its own type because the fold
// treats it as a fact about the feed and carries on, while any other error
// thrown in the same place is a bug of ours and has to keep travelling.
class UnkeyableEntryError extends Error {
  constructor (entry) {
    super(`Cannot find a key for ${JSON.stringify(entry)}`)

    this.name = 'UnkeyableEntryError'
  }
}

export default UnkeyableEntryError
