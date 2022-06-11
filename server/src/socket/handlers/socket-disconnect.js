"use strict";
const winston = require("../../config/winston");
const {
  unifyString,
  isStringEqual,
} = require("../../helpers/utility-functions");

const disconnect = (socket) => () => {
  let username = socket.username;
  let userID = socket.userID;

  if (!(username && userID))
    return winston.info(
      `USER DISCONNECTED SOCKET: Couldn't find user keys in socket object ${
        socket.userID + " " + socket.username + " " + socket.name + " "
      }`
    );

  getValueOfKey_redis(`${userID}`)
    .then((user) => {
      user = prs(user);
      let chats = user.chats;

      return Promise.all(
        chats.map((chat) => {
          return getValueOfKey_redis(`${chat._id}`).then((res) => {
            if (!res) return null;

            return { ...chat, cBucket: prs(res).cBucket };
          });
        })
      ).then((res) => {
        // making sure the bucket number is most recent
        user.chats = user.chats.map((ele, i) => {
          if (res[i]) {
            if (isStringEqual(`${res[i]._id}`, `${ele._id}`)) {
              ele.cBucket = res[i].cBucket;
              return ele;
            }
          }
          return ele;
        });

        let sequence = [];
        if (!user)
          return winston.warn(
            `SOCKET DISCONNECT: user info not found in cache`
          );

        return getAList_redis(`${userID}:chats`)
          .then((chatSequence) => {
            if (chatSequence) {
              // keeping map of user (to avoid O(n2))
              let userChats = {};
              // creating map of each chat id. if userChats has duplicates will eliminate at this step
              user.chats.forEach((chat) => {
                userChats[chat._id] = chat;
              });

              // looping through the sequence array and extracting the matchin key from userChat map
              chatSequence.forEach((chat, i) => {
                chat = prs(chat);

                chat = { ...userChats[chat._id] };

                // checking if chat is falsy e.g. if chatSequence has duplicates will eliminate at this step
                if ("_id" in chat) {
                  delete userChats[chat._id];
                  sequence.push(chat);
                }
              });

              for (const key in userChats)
                if (userChats.hasOwnProperty(key))
                  sequence.push(userChats[key]);
            }

            if (!sequence.length) sequence = user.chats;

            // updateChatAndLastScene(userID, sequence, Date.now())
            //   .catch(e => winston.warn(`SOCKET DISCONNECT: Error while updating lastseen/chat sequence in db : ERROR ${e}`))

            // updated = true;
          })
          .catch((e) =>
            winston.warn(
              `SOCKET DISCONNECT: Error while fetching user chats from redis: ERROR ${e}`
            )
          )
          .finally(() => {
            if (sequence.length)
              updateChatAndLastScene(userID, sequence, Date.now())
                .catch((e) =>
                  winston.warn(
                    `SOCKET DISCONNECT: Error while updating lastseen/chat sequence in db : ERROR ${e}`
                  )
                )
                .catch((e) =>
                  winston.warn(
                    `SOCKET DISCONNECT: Error while collecting garbage : ERROR ${e}`
                  )
                );
          });
      });
    })
    .then(() =>
      winston.info(`SOCKET DISCONNECT: user disconnected successfuly`)
    )
    .catch((e) =>
      winston.warn(
        `SOCKET DISCONNECT: Error while fetching user from redis: ERROR ${e}`
      )
    );
};

module.exports = disconnect;
