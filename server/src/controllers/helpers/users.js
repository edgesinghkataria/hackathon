"use strict";
const io = require("../../socket/io");
const UserModel = require("../../schemas/users");
const UserChatModel = require("../../schemas/userchats");
const P2PModel = require("../../schemas/p2ps");
const mongoose = require("mongoose");

const winston = require("../../config/winston");
const {
  join_leave_p2ps,
  join_leave_rooms,
} = require("../../socket/handlers/helpers/join-leave-rooms");

const {
  areParametersValid,
  getEstimateBucket,
  isStringEqual,
  limitifyAndOffsetify,
  unifyString,
} = require("../../helpers/utility-functions");
const {
  generateError,
  generateResponse,
} = require("../../helpers/api-response");

const createUser = (name, mobileNumber, socketID, mentorkey) => {
  return UserModel.create({
    name,
    mobileNumber,
    socketID,
    mentorkey,
  }).catch((e) => console.log(e));
};

async function updateUserSocket(userId, socketId) {
  return UserModel.updateOne(
    { _id: userId },
    { $set: { socketId: socketId } },
    (err, res) => {
      if (err) reject(err);
      else resolve(res);
    }
  );
}

const getUser = (_id) =>
  new Promise((resolve, reject) => {
    UserModel.findById(_id, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });

const getUserByUsername = (username) => {
  return UserModel.findOne({ username }).catch((e) => console.log(e));
};

const getUserByMobile = (mobileNumber) => {
  return UserModel.findOne({ mobileNumber }).catch((e) => console.log(e));
};

const findUserChatWith = (cID, bucket, type) => {
  if (type === "p2p") {
    return UserChatModel.findOne({ cID, bucket }).populate("messages.from");
  }
};

const getUserById = (id, options) =>
  new Promise((resolve, reject) => {
    UserModel.findById(id, options, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });

const findP2pInUser = (id, p2pId) =>
  new Promise((resolve, reject) => {
    UserModel.findOne(
      { _id: id, chats: { $elemMatch: { _id: p2pId, type: "p2p" } } },
      { chats: { $elemMatch: { member: p2pId } } }
    )
      .populate("chats._id")
      .exec((err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
  });

const getUsers = (usernames) =>
  new Promise((resolve, reject) => {
    UserModel.find({ _id: { $in: usernames } }, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });

const getAUserWithPopulate = (_id, path, select) =>
  new Promise((resolve, reject) => {
    UserModel.findOne({ _id })
      .populate({
        path,
        select,
      })
      .exec((err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
  });

const insertGroupInUser = (_id, groupid) =>
  new Promise((resolve, reject) => {
    UserModel.updateOne({ _id }, { $push: { groups: groupid } }, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });

const insertP2pInUser = (cond, data) =>
  new Promise((resolve, reject) => {
    UserModel.updateOne(cond, { $push: { p2ps: data } }, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });

const formatifyChatMessages = (
  messages,
  unread,
  offset,
  userID,
  length,
  limit,
  estObj
) => {
  // console.log(messages, unread, offset, userID, length, limit, estObj);

  /**
   * messages: array of message objects, will always be one extra if not then consider it to be last messages
   * unread: Number respersent total unread messages
   * limit: limit passed by client
   * offset: offset passed by client
   * userID: requester
   * length: length of unread messages in case of p2p
   * estObj: contains the leftover offset; can be greater than cCount
   *
   *
   * if messages-offset < limit, we can assume messages to be the oldest & push timestamp as first message stamp;
   * offset <= messages, hence offset will always be +ve
   */

  // will store message objects
  let arr = [],
    // length of the messages array
    msgLength = messages.length,
    // give us the loop till index & if end is negative initailise to 0;
    loopTill = msgLength - estObj.offset < 1 ? 0 : msgLength - estObj.offset,
    // end of the history
    oldest = false,
    // give us the loop from index 0 <= i <= {loopTill}
    i =
      loopTill - (limit - 1) <= 0
        ? (oldest = true) && 0
        : loopTill - (limit - 1),
    // will hold the place to insert bubble
    bubblePlace = -1,
    // number of extra elements apart apart from real messages
    extraCount = 0,
    // boolean to check unread
    found = false,
    // data of the first message aka extra message, if present
    cDate = messages[!i ? i : i - 1].time;

  // console.log(msgLength, loopTill, bubblePlace, i, limit, estObj, oldest);

  if (unread - offset > 0 && unread - offset < limit)
    bubblePlace = msgLength - estObj.offset - (unread - offset);

  // adds timestamp on top if messages are less than limit
  if (oldest) {
    arr.push({
      type: "timestamp",
      time: new Date(cDate),
    });
    ++extraCount;
  }

  for (; i < loopTill; i++) {
    let ele = messages[i];

    if (!found)
      if (i === bubblePlace && unread) {
        found = true;
        arr.push({
          type: "unread",
          count: unread,
          text: "new message",
        });
        ++extraCount;
      }

    if (new Date(ele.time).getDay() !== new Date(cDate).getDay()) {
      cDate = ele.time;
      arr.push({
        type: "timestamp",
        time: new Date(cDate),
      });
      ++extraCount;
    }

    if (ele.from && ele.from._id && isStringEqual(userID, ele.from._id)) {
      if (!length) {
        let attachment = ele.image
          ? {
              thumbnail: ele.image.thumbnail,
              original: ele.image.image,
            }
          : ele.image;
        delete ele._doc.image;

        arr.push({
          ...ele._doc,
          invitationDetails: ele.invite ? { id: ele.invite } : undefined,
          attachment:
            ele.type == "sticker" && attachment
              ? { ...attachment, ...getGiphyObj(attachment.original) }
              : attachment,
          userID: ele._id,
          from: ele.from && {
            userID: ele.from._id,
            username: ele.from.username,
            name: ele.from.name,
          },
          status: "seen",
        });
      } else if (i > loopTill - length - 1) {
        let attachment = ele.image
          ? {
              thumbnail: ele.image.thumbnail,
              original: ele.image.image,
            }
          : ele.image;
        delete ele._doc.image;

        arr.push({
          ...ele._doc,
          attachment:
            ele.type == "sticker" && attachment
              ? { ...attachment, ...getGiphyObj(attachment.original) }
              : attachment,
          invitationDetails: ele.invite ? { id: ele.invite } : undefined,
          userID: ele._id,
          from: ele.from && {
            userID: ele.from._id,
            username: ele.from.username,
            name: ele.from.name,
          },
          status: "sent",
        });
      } else {
        let attachment = ele.image
          ? {
              thumbnail: ele.image.thumbnail,
              original: ele.image.image,
            }
          : ele.image;
        delete ele._doc.image;

        arr.push({
          ...ele._doc,
          attachment:
            ele.type == "sticker" && attachment
              ? { ...attachment, ...getGiphyObj(attachment.original) }
              : attachment,
          invitationDetails: ele.invite ? { id: ele.invite } : undefined,
          userID: ele._id,
          from: ele.from && {
            userID: ele.from._id,
            username: ele.from.username,
            name: ele.from.name,
          },
          status: "seen",
        });
      }
    } else {
      let attachment = ele.image
        ? {
            thumbnail: ele.image.thumbnail,
            original: ele.image.image,
          }
        : ele.image;
      delete ele._doc.image;
      arr.push({
        ...ele._doc,
        attachment:
          ele.type == "sticker" && attachment
            ? { ...attachment, ...getGiphyObj(attachment.original) }
            : attachment,
        invitationDetails: ele.invite ? { id: ele.invite } : undefined,
        userID: ele._id,
        from: ele.from && {
          userID: ele.from._id,
          username: ele.from.username,
          name: ele.from.name,
        },
      });
    }
  }

  return { messages: arr, length: extraCount, unread };
};

const formatForGroup = (channelInfo, unread, lstMsg) => {
  lstMsg = lstMsg.messages;

  return Promise.resolve({
    channelID: channelInfo._id,
    name: channelInfo.name,
    description: channelInfo.desc,
    avatar: channelInfo.avatar,
    unread: (unread && unread[channelInfo._id]) || 0,
    chatType: "group",
    lastMessage: lstMsg.length
      ? {
          messageID: lstMsg[0]._id,
          text: lstMsg[0].text,
          time: lstMsg[0].time,
          type: lstMsg[0].type,
          invitationDetails: lstMsg[0].invite
            ? { id: lstMsg[0].invite }
            : undefined,
          from: {
            userID: lstMsg[0].from._id,
            username: lstMsg[0].from.username,
          },
          delivered: lstMsg[0].delivered,
        }
      : null,
  });
};

function sequencify(
  lastMessage,
  channelInfo,
  unread,
  requester,
  memberInfo,
  i
) {
  let lstMsg = lastMessage.messages;
  let cdnRegx = new RegExp(/(com\/)/);

  if (channelInfo.type === "p2p") {
    if (lstMsg[0] && lstMsg[0].from && lstMsg[0].from._id) {
      if (isStringEqual(lstMsg[0].from._id, requester)) {
        let memberId = channelInfo.member,
          member = memberInfo[memberId];

        return getAList_redis(`${memberId}:unread`).then((mUnread) => {
          if (!mUnread) mUnread = [];

          mUnread = mUnread.filter((ele) => {
            ele = prs(ele);
            return isStringEqual(ele.channelID, channelInfo._id);
          });

          if (!mUnread.length) {
            return {
              channelID: channelInfo._id,
              unread: unread[channelInfo._id] || 0,
              role: member.role,
              userID: member._id,
              username: member.username || member.name,
              avatar: member.avatar.split(cdnRegx)[2] || member.avatar,
              chatType: "p2p",
              lastMessage: lstMsg.length
                ? {
                    messageID: lstMsg[0]._id,
                    text: lstMsg[0].text,
                    type: lstMsg[0].type,
                    time: lstMsg[0].time,
                    invitationDetails: lstMsg[0].invite
                      ? { id: lstMsg[0].invite }
                      : undefined,
                    from: {
                      userID: lstMsg[0].from._id,
                      username: lstMsg[0].from.username,
                    },
                    status: "seen",
                    delivered: lstMsg[0].delivered,
                  }
                : null,
            };
            // :
            // null
          } else {
            return {
              channelID: channelInfo._id,
              unread: unread[channelInfo._id] || 0,
              role: member.role,
              userID: member._id,
              username: member.username || member.name,
              avatar: member.avatar.split(cdnRegx)[2] || member.avatar,
              chatType: "p2p",
              lastMessage: lstMsg.length
                ? {
                    messageID: lstMsg[0]._id,
                    text: lstMsg[0].text,
                    type: lstMsg[0].type,
                    time: lstMsg[0].time,
                    invitationDetails: lstMsg[0].invite
                      ? { id: lstMsg[0].invite }
                      : undefined,
                    from: {
                      userID: lstMsg[0].from._id,
                      username: lstMsg[0].from.username,
                    },
                    status: "sent",
                    delivered: lstMsg[0].delivered,
                  }
                : null,
            };
          }
        });
      } else if (lstMsg[0] && !isStringEqual(lstMsg[0].from._id, requester)) {
        let member = memberInfo[lstMsg[0].from._id];

        return Promise.resolve({
          channelID: channelInfo._id,
          unread: unread[channelInfo._id] || 0,
          role: member.role,
          userID: member._id,
          username: member.username || member.name,
          avatar: member.avatar.split(cdnRegx)[2] || member.avatar,
          chatType: "p2p",
          lastMessage: lstMsg.length
            ? {
                messageID: lstMsg[0]._id,
                text: lstMsg[0].text,
                type: lstMsg[0].type,
                time: lstMsg[0].time,
                invitationDetails: lstMsg[0].invite
                  ? { id: lstMsg[0].invite }
                  : undefined,
                from: {
                  userID: lstMsg[0].from._id,
                  username: lstMsg[0].from.username,
                },
                delivered: lstMsg[0].delivered,
              }
            : null,
        });
      }
    }
  } else return formatForGroup(channelInfo, unread, lastMessage);
}

const sequencifyChats = (
  sequence,
  unread,
  lastMessageList,
  channelInfo,
  requester,
  memberInfo
) => {
  let obj = {};

  memberInfo.forEach((ele) => {
    if (ele) obj[ele._id] = ele;
  });
  memberInfo = obj;

  if (unread) {
    obj = {};
    unread.forEach((ele) => {
      ele = prs(ele);
      obj[ele.channelID] ? (obj[ele.channelID] += 1) : (obj[ele.channelID] = 1);
    });
    unread = obj;
  }

  obj = {};
  sequence.forEach((ele) => {
    ele = prs(ele);
    if (ele) obj[ele._id] = ele;
  });
  sequence = obj;

  lastMessageList = lastMessageList.map(
    (ele, i) =>
      ele && sequencify(ele, channelInfo[i], unread, requester, memberInfo, i)
  );

  let temp = [];
  return Promise.all(lastMessageList).then((chats) => {
    chats.forEach((ele) => {
      if (ele && sequence[ele.channelID]) temp.push(ele);
    });
    return temp;
  });
};

const findP2pChatByID = function (_id) {
  return P2PModel.findById(_id).catch((e) => console.log(e));
};

/**
 *
 * @param {String} requestor userID
 * @param {String} user userID
 * @param {String} id P2P channel ID
 * @returns {Array} array contains new P2P document, P2Pchat document & both users info document
 */
const createP2PChat = function (requestor, user, _id) {
  return Promise.all([
    UserModel.findOne({ _id: requestor }),
    UserModel.findOne({ _id: user }),
  ])
    .then((res) => {
      if (res[0] && res[1])
        return Promise.all([
          P2PModel.create({ _id, members: [requestor, user], cBucket: 1 }),
          UserChatModel.create({
            cID: _id,
            bucket: 1,
            count: 0,
            createdAt: Date.now(),
          }),
          UserModel.findOneAndUpdate(
            { _id: requestor },
            {
              $addToSet: {
                chats: {
                  _id,
                  member: user,
                  name: res[1].username,
                  type: "p2p",
                  idModel: "p2ps",
                  cBucket: 1,
                },
              },
            }
          ),
          UserModel.findOneAndUpdate(
            { _id: user },
            {
              $addToSet: {
                chats: {
                  _id,
                  member: requestor,
                  name: res[0].username,
                  type: "p2p",
                  idModel: "p2ps",
                  cBucket: 1,
                },
              },
            }
          ),
        ]).catch((e) => {
          throw e;
        });
      else
        throw new Error(
          `couldn't create P2P as some users are not registered.`
        );
    })
    .catch((e) => {
      throw e;
    });
};

const create_chat = (
  requester,
  chatWith,
) => {
   return create_chat_helper(requester, chatWith);
};

async function create_chat_helper (requester, chatWith) {
  const result = await findP2pChat(requester, chatWith);

    if (result.length > 1) throw new Error("DB got more p2ps");

      result = result[0];

      if (result)
        return {
          statusCode: 200,
          data: {
            status: true,
            known: true,
            channelID: result._id,
            lastSeen,
            isBlocked: false,
          },
        };

        let channelID = mongoose.Types.ObjectId();

        const newP2PArr = await createP2PChat(requester, chatWith, channelID)
        const newP2PInfo = newP2PArr[0]; // P2P info
        let user = newP2PArr[3]; // target user to chat with
        channelID = newP2PInfo._id; // P2P channel ID got from mongoDB

        socket && join_leave_p2ps(socket, [{ _id: channelID }], "join");
    
        return {
          statusCode: 200,
          data: {
            status: true,
            known: false,
            desc: "chat created!",
            channelID,
            messages: [],
          },
        };
};

const storeP2PChat = (
  { channelID, from, text, time, type, platform, image, invite, post },
  bucket
) => {
  return UserChatModel.findOneAndUpdate(
    { cID: channelID, bucket },
    {
      $push: {
        messages: { from, text, time, type, platform, image, invite, post },
      },
      $inc: { count: 1 },
    }
  ).catch((e) => {
    throw e;
  });
};


async function create_user(name,mobileNumber, socketID, mentorkey) {
  try {
    const playerData = await getUserByMobile(mobileNumber);
    console.log(playerData, ' data found ');
    /**
     * if user doesn't exist in DB
     */
    if (!playerData) {
      /**
       * creating a user entry in DB
       */
      const userData = await createUser(name, mobileNumber, socketID, mentorkey);

      return {
        status: true,
        desc: "user created!!",
        userID: userData._id,
        unread: 0,
      };
    }

    /**
     * if user exist in DB
     */
    const userID = playerData._id;

    updateUserSocket(userID, socketID);
    /**
     * adding socket to the rooms
     */
    join_leave_rooms(socketID, userChats, "join");

    return { status: true, desc: "user already exists!!", userID, unread };
  } catch (error) {
    console.error(error);
    throw error;
  }
}

const getChatsFromUser_redis = (userID) => {
  return getValueOfKey_redis(userID)
    .then((res) => {
      if (res) return prs(res);

      return UserModel.findById(userID).then((res) => {
        if (!res) throw new Error("Please contact Admin");

        res = res._doc;
        setValueOfKeyNX_redis(`${res._id}`, sfy(res));
        return res;
      });
    })
    .catch((e) => {
      throw e;
    });
};

const getUserChats_helper = (ele, userID, offset, limit) => {
  if ("name" in ele) {
    // perform task 1
  } else {
    // perform task 2
  }

  return getChatsFromUser_redis(userID).then((userInfo) => {
    let promiseList = [],
      memberInfo = [],
      channelID = null,
      userChats = userInfo.chats,
      loopTill = limit + offset;

    if (userChats.length <= offset)
      return {
        userID: userInfo._id,
        username: userInfo.username,
        name: userInfo.name,
        chats: [],
      };
    if (userChats.length <= loopTill) {
      let hold = loopTill - userChats.length;
      loopTill = loopTill - hold;
      limit = limit - hold;
    }

    // looping to get ChatsBox info and last message of chatboxes
    for (let i = offset; i < loopTill; i++) {
      const userChat = userChats[i];

      if (userChat.type === "p2p") {
        channelID = userChat._id;
        promiseList[i - offset] = getP2pInfo(channelID, userID);
        promiseList[limit + (i - offset)] = getLastMessageOfP2p(
          channelID,
          userChat.cBucket,
          userChat.mID
        );
        memberInfo.push(findUserByID(userChat.member, "-chats"));
      } else if (userChat.type === "group") {
        channelID = userChat._id;
        promiseList[i - offset] = getGroupInfo(channelID);
        promiseList[limit + (i - offset)] = getLastMessageOfGroup(
          channelID,
          userChat.cBucket,
          userChat.mID
        );
      }
    }

    // pushing memberinfo in promiselist
    memberInfo.forEach((ele) => promiseList.push(ele));

    return Promise.all(promiseList).then((result) => {
      // this will hold the length of chat info and last messages of chatboxes
      let hold = promiseList.length - memberInfo.length;

      // this will hold the length of chat info. half of the length of chats
      let length = hold / 2;

      if (hold % 2 !== 0) winston.warn("array doesn't have even count " + hold);

      let channelInfo = result.slice(0, length),
        lastMessages = result.slice(length, hold);
      memberInfo = result.splice(hold, result.length);

      length = channelInfo.length;

      // caching channels info as micro task
      Promise.resolve().then(() => {
        // user chats
        let UC = userInfo.chats,
          counter = 0;

        for (let i = 0; i < length; i++) {
          hold = channelInfo[i];

          if (!hold) {
            winston.warn(
              "CHAT INFO NOT FOUND IN " +
                hold.type +
                " BUT PRESENT IN USER CHAT" +
                hold._id
            );
            continue;
          }

          if (!("name" in hold)) {
            UC.push({
              _id: hold._id,
              member: hold.members.filter((e) => !isStringEqual(userID, e))[0],
              name: memberInfo[counter].username,
              type: "p2p",
              idModel: "p2ps",
              cBucket: hold.cBucket,
              mID: hold.mID,
            });
            ++counter;
          } else
            UC.push({
              _id: hold._id,
              name: hold.name,
              type: "group",
              idModel: "groups",
              cBucket: hold.cBucket,
            });

          // adding count key in channel details cache
          hold.count = lastMessages[i].count;

          setValueOfKeyNX_redis(`${hold._id}`, sfy(hold)).catch((e) => {
            winston.info({
              message: "couldn't cache channels",
              stackTrace: e,
              userID,
            });
          });
        }

        setValueOfKey_redis(`${userID}`, sfy(userInfo));
      });

      return getAList_redis(`${userID}:unread`)
        .then((unread) => {
          return getAList_redis(`${userID}:chats`)
            .then((sequence) => {
              return sequencifyChats(
                sequence ? sequence : [],
                unread,
                lastMessages,
                channelInfo,
                userID,
                memberInfo
              ).then((chats) => ({
                userID: userInfo._id,
                username: userInfo.username,
                name: userInfo.name,
                chats,
              }));
            })
            .catch((e) => {
              winston.info({
                message: `Error while fetching chat sequence in cache`,
                stackTrace: e,
                userID,
              });
            });
        })
        .catch((e) => {
          winston.warn({
            message: `Error while fetching the sequence and unread in cache`,
            stackTrace: e,
            userID,
          });
          return sequencifyChats(
            [],
            lastMessageList,
            [],
            userChats,
            userID,
            memberArray
          ).then((chats) => ({
            userID: userInfo._id,
            username: userInfo.username,
            name: userInfo.name,
            chats,
          }));
        });
    });
  });
};

const getUserChats = (userID, offset, limit) => {
  if (limit > 50) limit = 50;

  return getChatsFromUser_redis(userID)
    .then((userInfo) => {
      let promiseList = [],
        memberInfo = [],
        channelID = null,
        loopTill = limit + offset;

      return getAList_redis(`${userID}:chats`)
        .then((sequence) => {
          let s_length = sequence.length;

          if (s_length <= offset)
            return {
              userID: userInfo._id,
              username: userInfo.username,
              name: userInfo.name,
              chats: [],
            };
          if (s_length <= loopTill) {
            let hold = loopTill - s_length;
            loopTill = loopTill - hold;
            limit = limit - hold;
          }

          if (s_length >= loopTill) {
            // fetch data from sequence and process
            for (let i = offset; i < loopTill; i++) {
              // const userChat = userChats[i];
              let ele = (sequence[i] = prs(sequence[i]));

              if (isStringEqual(ele.type, "group")) {
                // perform action for group type
                channelID = ele._id;

                promiseList[i - offset] = getGroupInfo(channelID);
                promiseList[limit + (i - offset)] = getLastMessageOfGroup(
                  channelID,
                  ele.cBucket,
                  ele.mID
                );
              } else {
                // perform action for p2p type
                channelID = ele._id;

                promiseList[i - offset] = ele;
                promiseList[limit + (i - offset)] = getLastMessageOfP2p(
                  channelID,
                  ele.cBucket,
                  ele.mID
                );
                memberInfo.push(findUserByID(ele.member, "-chats"));
              }
            }

            // pushing memberinfo in promiselist
            memberInfo.forEach((ele) => promiseList.push(ele));

            return Promise.all(promiseList).then((result) => {
              // this will hold the length of chat info and last messages of chatboxes
              let hold = promiseList.length - memberInfo.length;

              // this will hold the length of chat info. half of the length of chats
              let length = hold / 2;

              if (hold % 2 !== 0)
                winston.warn("array doesn't have even count " + hold);

              let channelInfo = result.slice(0, length),
                lastMessages = result.slice(length, hold);
              memberInfo = result.splice(hold, result.length);

              // caching channels info as micro task
              Promise.resolve()
                .then(() => {
                  // user chats
                  let UC = userInfo.chats,
                    counter = 0;

                  for (let i = 0; i < length; i++) {
                    hold = channelInfo[i];
                    // console.log(hold)
                    if (!hold) {
                      winston.warn(
                        "CHAT INFO NOT FOUND IN " +
                          hold.type +
                          " BUT PRESENT IN USER CHAT" +
                          hold._id
                      );
                      continue;
                    }

                    if (hold.type === "p2p") {
                      UC.push({
                        _id: hold._id,
                        member: hold.member,
                        name: memberInfo[counter].username,
                        type: "p2p",
                        idModel: "p2ps",
                        cBucket: hold.cBucket,
                      });
                      ++counter;
                      continue;
                    } else
                      UC.push({
                        _id: hold._id,
                        name: hold.name,
                        type: "group",
                        idModel: "groups",
                        cBucket: hold.cBucket,
                        mID: sequence[i].mID,
                      });

                    // adding count key in channel details cache
                    hold.count = lastMessages[i].count;

                    setValueOfKeyNX_redis(`${hold._id}`, sfy(hold)).catch(
                      (e) => {
                        winston.info({
                          message: "couldn't cache channels",
                          stackTrace: e,
                          userID,
                        });
                      }
                    );
                  }

                  userInfo.chats = UC;
                  setValueOfKey_redis(`${userID}`, sfy(userInfo));
                })
                .catch((e) => {
                  winston.warn({
                    message: `Error while resolving chat name`,
                    stackTrace: e,
                    userID,
                  });
                  throw generateError(400, e.message);
                });

              return getAList_redis(`${userID}:unread`).then((unread) => {
                return getAList_redis(`${userID}:chats`)
                  .then((sequence) => {
                    // console.log(sequence);

                    return sequencifyChats(
                      sequence ? sequence : [],
                      unread,
                      lastMessages,
                      channelInfo,
                      userID,
                      memberInfo
                    ).then((chats) => ({
                      userID: userInfo._id,
                      username: userInfo.username,
                      chats,
                    }));
                  })
                  .catch((e) => {
                    winston.info({
                      message: `Error while fetching chat sequence in cache`,
                      stackTrace: e,
                      userID,
                    });
                  });
              });
            });
          } else {
            // fetch data from db and check if more chats are present
          }
        })
        .catch((e) => {
          winston.warn({
            message: `Error while fetching User`,
            stackTrace: e,
            userID,
          });
          throw generateError(400, e.message);
        });
    })
    .catch((e) => {
      winston.warn({
        message: `Error while fetching User`,
        stackTrace: e,
        userID,
      });
      throw generateError(400, e.message);
    });
};

module.exports = {
  updateUserSocket,
  create_chat,
  create_user,
  createP2PChat,
  createUser,
  findP2pInUser,
  findUserChatWith,
  findP2pChatByID,
  getUserById,
  getUser,
  getUsers,
  getUserChats,
  getAUserWithPopulate,
  getUserByUsername,
  getUserByMobile,
  insertGroupInUser,
  insertP2pInUser,
  storeP2PChat,
  formatifyChatMessages,
};
