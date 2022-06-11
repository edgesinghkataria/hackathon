'use strict'
const winston = require('../../config/winston');
const setupUserSocket = require('./helpers/register-socket');

const registerSocket = (socket) => (data, ack) => {

  /**
   * storing username & name in socket obj
   */
  socket.username = data.username;
  socket.name = data.name;
  socket.userID = data.userID;

  /**
   * adding socket to the rooms
   */
  return setupUserSocket(true, socket, data, ack)
  .catch(e => winston.error(`couldn't setup user socket: t-stamp:${Date.now()} : ${e}`))

}

module.exports = registerSocket;