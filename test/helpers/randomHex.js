const randomHex = (length = 1000000) =>
  Math.round(Math.random() * length).toString(16);

module.exports = { randomHex };
