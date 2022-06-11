'use strict'
const io = require('../../io');
const { ONLINE_USERS_INTERVAL } = require('../../../config/index.js');
const PER_BATCH_SIZE = 50;
let cdnRegx = new RegExp(/(com\/)/);

const sendOnlineUsers = (requester) => {
  getItemsFromSortedSet('onlineusers', -1)
    .then(res => {

      if (!res)
        return;

      res = res.map(e => {
        e = e.split(':');
        return getValueOfKey_redis(e[1]);
      })


      Promise.all(res)
        .then(res => {

          let result = [],
            socket = null;

          for (let i = 0; i < res.length; i++) {
            const ele = prs(res[i]);

            if (ele && ele._id === requester)
              socket = io.sockets.connected[ele.socket];


           if (ele)
              result.push({
                username: ele.username,
                userID: ele._id,
                avatar: ele.avatar.split(cdnRegx)[2] || ele.avatar,
                playerID: ele.playerID,
                game: ele.games,
                location: [ele.location]
              })
          }
          console.log("sending new event", requester);

          if (socket)
            return socket.emit('online_users', result);

          console.log(result.length, 'online users', Object.keys(io.nsps['/'].connected).length);
          if (result.length)
            io.emit('online_users', result)
        })

    })
}

setInterval(sendOnlineUsers,
  ONLINE_USERS_INTERVAL)

module.exports = sendOnlineUsers;
