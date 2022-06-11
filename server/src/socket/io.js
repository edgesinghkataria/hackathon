const createIO = require('socket.io');
const { server } = require('../config/http-server');

const io = createIO(server);

module.exports = io;