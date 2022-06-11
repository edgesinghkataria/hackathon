'use strict'
const { getUserByUsername } = require('../../../controllers/helpers/users')
const { join_leave_rooms } = require('./join-leave-rooms');
const winston = require('../../../config/winston');
const io = require('../../io');

/**
 * adding user to rooms and removing from rooms
 * true == add | false == remove
 * 
 * @param {Boolean} add_or_remove_user true/false
 * @param {Object} socket socket object
 * @param {Object} data user data
 * @returns {null}
 * 
 */
const setupUserSocket = (bool, socket, data) => new Promise((resolve, reject) => {

  if ('string' === typeof socket)
    socket = io.sockets.connected[socket];

  /**
   * storing username & name in socket obj
   */
  let { username, name, userID } = data;

  socket.username = username;
  socket.name = name;
  socket.userID = userID;


  /**
   * get User Information from cache
   */
  getValueOfKey_redis(`${userID}`)
    .then(res => {

      /**
       * parse cache result
       */
      res = prs(res);

      let join_leave = 'join';

      /**
       * if found in cache
       */
      if (res) {

        /**
         * deciding if remove socket or add socket
         * to the room
         */
        if (!bool)
          join_leave = 'leave';

        /**
         * updating socket id in the cache
         */
        setValueOfKey_redis(`${userID}`, sfy({ ...res, socket: socket.id }))
          .then(() => {

            /**
             * looping through the chats
             * adding user in rooms
             */
            join_leave_rooms(socket, res.chats, join_leave)

            //resolving the promise
            resolve()

          })
          .catch(e => winston.warn(`couldn\'t update the socket id : redis : ${e}`))

      }

      /**
       * else (if not found in cache)
       */
      else {

        /**
         * get User Information from mongoDB
         */
        getUserByUsername(username)
          .then(res => {

            if (res) {

              /**
               * caching the mongoDB results
               */
              setValueOfKey_redis(`${res._id}`, sfy({ ...res, socket: socket.id }))
                .then(() => {

                  /**
                   * deciding if remove socket or add socket
                   * to the room base on argument passed
                   */
                  if (!bool)
                    join_leave = 'leave';

                  /**
                   * looping through the chats
                   * adding user in rooms
                   */
                  join_leave_rooms(socket, res.chats, join_leave)


                  //resolving the promise
                  resolve()
                })
                .catch(e => winston.warn(`couldn\'t setup user cache : redis : ${e}`))
            }
            else{

              //rejecting if couldn't find the user anywhere
              reject('User not found!!!')
            }
          })
          .catch(e => winston.warn(`couldn\'t make query : DB : ${e}`))
      }
    })
})
  .catch(e => winston.warn(`Error while setting up user socket : ${e}`))

module.exports = setupUserSocket;