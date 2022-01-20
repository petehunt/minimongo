const tickAsync = () =>
  new Promise((resolve) => {
    process.nextTick(() => resolve());
  });

module.exports = { tickAsync };
