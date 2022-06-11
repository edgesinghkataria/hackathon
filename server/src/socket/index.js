'use strict'

const io = require('./io');
const winston = require('../config/winston');
const {
  NEW_SOCKET_CONNECT,
  USER_TYPING,
  USER_STOP_TYPING,
  NEW_MESSAGE_RECIEVED,
  SOCKET_DISCONNECT,
  ANNOUNCEMENTS, 
  ONLINE_USERS,
 } = require('../constants/eventNames');

const {
  handle_new_message,
  handle_socket_disconnect,
 } = require('./handlers');

/**
 * 
 * @param {Object} socket socket connection object 
 */
const setupListeners = (socket) => {

  socket.on(NEW_MESSAGE_RECIEVED, handle_new_message(socket))
  socket.on(SOCKET_DISCONNECT, handle_socket_disconnect(socket))

  socket.on('test', (ack) => ack(io.nsps['/'].adapter.rooms))
  socket.on('get_group', (data, ack) => events.getGroup(data, ack))
  socket.on('broadcast', (data) => {

    socket.emit('broadcast', data + ' from connection num '+ socket.username);
  })
}

//start listening to new socket on io object
try {
  io.on(NEW_SOCKET_CONNECT, setupListeners);
} catch (e) {
  winston.warn(`SOCKET CONNECT: error while setting up socket event listeners ${e}`)
}