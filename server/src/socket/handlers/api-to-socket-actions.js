'use strict'
const io = require('../io');
const {
  MEMBERS_ADDED_TO_GROUP,
  MEMBERS_REMOVED_FROM_GROUP,
  NEW_GROUP_CREATED,
  NEW_P2P_CREATED,
  EXITED_FROM_A_GROUP,
  MESSAGES_SEEN } = require('../../constants/api-to-socket');
const {
  NEW_GROUP_NOTIFICATION,
  KICKED_MEMBER_NOTIFICATION,
  NEW_MEMBER_NOTIFICATION,
  MESSAGES_SEEN_EVENT, } = require('../../constants/eventNames');
const { join_leave_groups, join_leave_p2ps } = require('./helpers/join-leave-rooms');
const {isStringEqual} = require('../../helpers/utility-functions');

const api_to_socket_actions = (data, action) => {
  switch (action) {

    /**
     * func tasks
     * get the data of members (only from cache)
     * make a room for the new group request
     * looping through the members of the group
     */
    case NEW_GROUP_CREATED:

      return Promise.all(
        data.members.map(ele => {

          /**
           * finding them only in cache
           */
          return getValueOfKey_redis(`${ele.userID}`)
        }))
        .then((raw) => {
          

          let result = raw.map(rawEle => {

            //parsing the cache result
            rawEle = prs(rawEle);

            /**
             * Dont proceed if no data
             */
            if (!rawEle)
              return;

            /**
             * updating the cache with the new group
             */
            rawEle.chats.push({_id: data.channelID, type:'group', idModel: 'groups'});

            /**
             * getting socket object from socket id
             * if user is connected else returns `undefined`
             */
            let socket = io.sockets.connected[rawEle.socket]


            /**
             * 
             */
            
            /**
             * creating rooms & adding users to it
             */
            socket && join_leave_groups(socket, [ {_id: data.channelID} ], 'join')
          })

          /**
           * emitting event to notify users in that room
           */
          Promise.all(result).then(() => io.to(`${data.channelID}`).emit(NEW_GROUP_NOTIFICATION, data))

        })

    case MEMBERS_ADDED_TO_GROUP:

      return Promise.all(data.members.map(memb => getValueOfKey_redis(`${memb.userID}`)))
        .then((membCache) => {

          io.to(`${data.channelID}`).emit(NEW_MEMBER_NOTIFICATION, { ...data, message: data.users.map(ele => `${data.username} added ${ele.username}`) });

          // console.log(data.members, '   membCache');
          membCache = membCache.map((memb, i) => {
            
            if (!memb || memb == 'undefined' || memb == 'null')
            return;
            
            memb = prs(memb);
            
            
            // setValueOfKey_redis(`${memb._id}`)

            let socket = io.sockets.connected[memb.socket];

            socket && join_leave_groups(socket, [ { _id: data.channelID } ], 'join') 
            && socket.emit(NEW_MEMBER_NOTIFICATION, { ...data, message: [`${data.username} added you`] })
          })

        })
        .catch(err => { console.log(err.message) });


    case MEMBERS_REMOVED_FROM_GROUP:
      return Promise.all(
        data.members.map(memb => getValueOfKey_redis(`${memb.userID}`))
      )
        .then(membCache => {

          let channelID = data.channelID
          membCache.forEach((memb, i) => {
            
            if (!memb || memb == 'undefined' || memb == 'null')
              return;
            
            memb = prs(memb);
            
            let socket = io.sockets.connected[memb.socket];
            
            socket && 
            join_leave_groups(socket, [ { _id: channelID } ], 'leave') &&
            socket.emit(KICKED_MEMBER_NOTIFICATION, { ...data, message: [`${data.username} removed you`]})
          })
           io.to(`${channelID}`).emit(KICKED_MEMBER_NOTIFICATION, { ...data, message: data.users.map(ele =>`${data.username} removed ${ele.username}`) })
        })
        .catch(err => { console.log(err.message) });

    /**
     * func resposible for
     * adding both the users socket to a room
     */
    case NEW_P2P_CREATED:
      return Promise.all(data.arr.map(ele => getValueOfKey_redis(`${ele.username}`)))
        .then(res => {

          res.forEach(ele => {

            //parsing each result
            ele = prs(ele)

            /**
             * getting socket object from socket id
             * if user is connected else returns `undefined`
             */
            socket = io.sockets.connected[ele.socket]


            /**
            * creating rooms & adding users to it
            */
            socket && join_leave_p2ps(socket, ele.data.p2ps, 'join')

          });
        })


    case EXITED_FROM_A_GROUP:
      return getValueOfKey_redis(`${data.userID}`)
      .then(res => {

        if(!res)
          return;

        res = prs(res);
        
        let socket = io.sockets.connected[res.socket];
        
        socket && join_leave_groups(socket, [{ _id: data.channelID }], 'leave');
        socket.emit(KICKED_MEMBER_NOTIFICATION, { members: [{ username: res.username, userID: data.userID }], channelID: data.channelID , message: [`You have exited the group`] })
        return res.username
      })
      .then(username =>  {io.to(`${data.channelID}`).emit(KICKED_MEMBER_NOTIFICATION, { members: [{ username, userID: data.userID }] ,channelID: data.channelID , message: [`${username} exited from group`] });})
      .catch(e => { throw e })


    case MESSAGES_SEEN:
      return getValueOfKey_redis(`${data.userID}`)
      .then(res => {
        res = prs(res);
        if(res)
          io.to(`${res.socket}`).emit(MESSAGES_SEEN_EVENT, {channelID: data.channelID,})
      })
  }
  return null;
}

module.exports = api_to_socket_actions;
