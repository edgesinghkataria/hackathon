const generateError = (statusCode, message, description) => ({
  statusCode,
  data: {
    status: false,
    data: {
      message,
      description
    }
  }
})

const generateResponse = (statusCode, data) => ({
  statusCode,
  data : {
    status: true,
    data
  },
})

module.exports = {
  generateError,
  generateResponse,
}