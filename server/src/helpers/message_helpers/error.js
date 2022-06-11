function generateError(error) {
  return {
    status: false,
    errorName: error.name,
    errorMsg: error.message,
    createdAt: new Date().setTime(),
  };
}

module.exports = generateError;
