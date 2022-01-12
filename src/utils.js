function partial(fn, ...args) {
  return (..._args) => {
    return fn(...args, ..._args)
  }
}

module.exports = {
  partial
}