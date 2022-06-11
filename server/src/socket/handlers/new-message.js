"use strict";
const { MAX_BUCKET_SIZE } = require("../../config");
const generateMessage = require("../../helpers/message_helpers/message");
const { storeP2PChat } = require("../../controllers/helpers/users");
const winston = require("../../config/winston");

const { isStringEqual } = require("../../helpers/utility-functions");
const sendNewMessage = require("../../socket/send-message");
const lockChannels = global.__lockChannels__;
const messageLimit = global.__messageLimit__;
const chatLimit = global.__chatLimit__;

const sendMessage = (socket) => (data, ack) => {
  let {
    from = socket.userID,
    text,
    type,
    attachment,
    channelID,
    time,
    messageData,
    chatType,
    platform,
    partnerID,
    invitationDetails,
    post,
  } = data;

  console.log(from, "userid");
  let invite = invitationDetails && invitationDetails.id;

  if (!(from && (channelID || partnerID) && time && type && chatType)) {
    winston.info(
      `incomplete message parameters passed by: ${from} to channel: ${channelID} at ${time} (serverTime) : ${Date.now()}`
    );
    return ack({
      status: false,
      desc: `Please provide all the parameters`,
      channelID,
    });
  }

  if (
    (!attachment &&
      (type === "image" || type === "gif" || type == "sticker")) ||
    (attachment && type !== "image" && type !== "gif" && type !== "sticker")
  ) {
    winston.info(
      `Image was provided but message type was not image. incomplete message parameters passed by: ${from} to channel: ${channelID} at ${time} (serverTime) : ${Date.now()}`
    );
    return ack({
      status: false,
      desc: `Please check the parameters`,
      channelID,
    });
  }

  if (!text && type === "text") {
    winston.info(
      `incomplete image / text parameters passed by: ${from} to channel: ${channelID} at ${time} (serverTime) : ${Date.now()}`
    );
    return ack({
      status: false,
      desc: `Please provide all the parameters`,
      channelID,
    });
  }

  if (
    ((type === "tor_i" || type === "tea_i") && !invite) ||
    (!(type === "tor_i" || type === "tea_i") && invite)
  ) {
    winston.info(
      `incomplete image / text parameters passed by: ${from} to channel: ${channelID} at ${time} (serverTime) : ${Date.now()}`
    );
    return ack({
      status: false,
      desc: `Please provide all the parameters`,
      channelID,
    });
  }

  if (type === "post" && (!post || !post.id)) {
    winston.info(
      `incomplete image / text parameters passed by: ${from} to channel: ${channelID} at ${time} (serverTime) : ${Date.now()}`
    );
    return ack({
      status: false,
      desc: `Please provide all the parameters`,
      channelID,
    });
  }

  (function sendMessage_internal() {
    if (channelID && lockChannels.isChannelLocked(channelID)) {
      console.log(
        lockChannels.isChannelLocked(channelID),
        " is channel" + channelID + " locked",
        text,
        " PERFORM LATER "
      );
      performAgainLater(sendMessage_internal);
    } else {
      if (channelID) lockChannels.lockChannel(channelID);

      let temp = channelID;
      if (partnerID && !channelID) {
        channelID = partnerID;
        temp = null;
        lockChannels.lockChannel(channelID);
      }
      if (channelID && isTextInvalid(text)) {
        lockChannels.removeChannelLock(channelID);
        winston.info(
          `unfiltered text passed by: ${from} to channel: ${channelID} at ${time} (serverTime) : ${Date.now()} text: ${text}`
        );
        return ack({ status: false, desc: `Please filter you text` });
      }

      isAuthorisedToSend(from, temp, chatType, partnerID)
        .then((isAuthorised) => {
          if (isAuthorised) {
            channelID = isAuthorised._id;

            doesThisKeyExists(`${from}:mlimit`).then((res) => {
              if (messageLimit.hasLimitAceeded(from) && res) {
                lockChannels.removeChannelLock(channelID);
                setKeyWithExpiration(`${from}:mlimit`, 60);
                return ack({
                  status: false,
                  desc: `You've acceeded the message limit`,
                  channelID,
                });
              } else if (!res) {
                messageLimit.resetLimitForUser(from);
                setKeyWithExpiration(`${from}:mlimit`, 60).catch((e) =>
                  console.log(e)
                );
              }

              doesThisKeyExists(`${from}:climit`).then((res) => {
                if (chatLimit.hasLimitAceeded(from) && res) {
                  lockChannels.removeChannelLock(channelID);
                  setKeyWithExpiration(`${from}:climit`, 60);
                  return ack({
                    status: false,
                    desc: `You've acceeded the chat limit`,
                    channelID,
                  });
                } else if (!res) {
                  chatLimit.resetLimitForUser(from);
                  setKeyWithExpiration(`${from}:climit`, 60).catch((e) =>
                    console.log(e)
                  );
                }

                if (isAuthorised.count >= MAX_BUCKET_SIZE) {
                  let bucket = ++isAuthorised.cBucket;

                  updateCurrentBucketofP2p(
                    channelID,
                    bucket,
                    isAuthorised
                  ).then(() => {
                    function sendMessage(image) {
                      storeP2PChat(
                        {
                          channelID,
                          from,
                          text,
                          time,
                          type,
                          platform,
                          image,
                          invite,
                          post,
                        },
                        bucket
                      )
                        .then(() => {
                          updateBucketInUsers_redis(
                            channelID,
                            isAuthorised.members,
                            bucket
                          );
                          // .catch(e => console.log(e))

                          setValueOfKey_redis(
                            `${channelID}`,
                            sfy({ ...isAuthorised, count: 1, cBucket: bucket })
                          ).catch((e) => console.log(e));

                          messageData = generateMessage(
                            from,
                            socket.username,
                            channelID,
                            text,
                            time,
                            type,
                            image,
                            undefined,
                            "p2p",
                            invitationDetails,
                            post
                          );

                          sendFirebaseNotification(
                            from,
                            channelID,
                            text || "IMAGE",
                            chatType,
                            isAuthorised
                          ).catch((e) =>
                            console.log(e, "couln't send firebase notification")
                          );

                          sortByLastMessageForUsers(
                            from,
                            channelID,
                            "p2p"
                          ).catch((e) => console.log(e));

                          storeUnreadForUserInChannel(
                            channelID,
                            messageData
                          ).catch((e) => console.log(e));

                          sendNewMessage(socket, channelID, messageData);
                          messageLimit.setUserLimit(from);
                          chatLimit.setUserLimit(from, channelID);
                          lockChannels.removeChannelLock(channelID);
                          ack({
                            status: true,
                            desc: `message sent to ${channelID}`,
                            channelID,
                            messageID: res._id,
                            attachment: image
                              ? {
                                  thumbnail: image.thumbnail,
                                  original: image.image,
                                }
                              : undefined,
                            time,
                          });
                          winston.info(
                            `NEW MESSAGE from: ${from} to channel: ${channelID}(p2p) at: ${time} (serverTime): ${Date.now()}`
                          );
                        })
                        .catch((e) => {
                          lockChannels.removeChannelLock(channelID);
                          ack({
                            status: false,
                            desc: `message couldn't sent to ${channelID} ${e.message}`,
                            e: e.message,
                          });
                        });
                    }
                    sendMessage();
                  });
                } else {
                  //if count is falsy then initialise it
                  if (!isAuthorised.count) isAuthorised.count = 0;

                  console.log(isAuthorised);
                  setValueOfKey_redis(
                    `${channelID}`,
                    sfy({ ...isAuthorised, count: ++isAuthorised.count })
                  ).catch((e) => {
                    lockChannels.removeChannelLock(channelID);
                    winston.warn(
                      `Error occured while sending new message to: ${channelID}(p2p) from: ${from} at: ${time} (serverTime): ${Date.now()} Error: ${e}`
                    );
                  });

                  function sendMessage(image) {
                    storeP2PChat(
                      {
                        channelID,
                        from,
                        text,
                        time,
                        type,
                        platform,
                        image,
                        invite,
                        post,
                      },
                      isAuthorised.cBucket
                    )
                      .then(() => {
                        messageData = generateMessage(
                          from,
                          socket.username,
                          channelID,
                          text,
                          time,
                          type,
                          image,
                          undefined,
                          "p2p",
                          invitationDetails,
                          post
                        );

                        storeUnreadForUserInChannel(
                          channelID,
                          messageData
                        ).catch((e) => console.log(e));

                        sortByLastMessageForUsers(from, channelID, "p2p").catch(
                          (e) => console.log(e)
                        );

                        sendFirebaseNotification(
                          from,
                          channelID,
                          text || "IMAGE",
                          chatType,
                          isAuthorised
                        ).catch((e) =>
                          console.log(e, "couln't send firebase notification")
                        );

                        sendNewMessage(socket, channelID, messageData);
                        messageLimit.setUserLimit(from);
                        chatLimit.setUserLimit(from, channelID);
                        lockChannels.removeChannelLock(channelID);
                        ack({
                          status: true,
                          desc: `message sent to ${channelID}`,
                          channelID,
                          messageID: res._id,
                          attachment: image
                            ? {
                                thumbnail: image.thumbnail,
                                original: image.image,
                              }
                            : undefined,
                          time,
                        });
                        winston.info(
                          `NEW MESSAGE from: ${from} to channel: ${channelID}(p2p) at: ${time} (serverTime): ${Date.now()}`
                        );
                      })
                      .catch((e) => {
                        lockChannels.removeChannelLock(channelID);
                        winston.warn(
                          `Error occured while sending new message to: ${channelID}(p2p) from: ${from} at: ${time} (serverTime): ${Date.now()} Error: ${e}`
                        );
                        ack({
                          status: false,
                          desc: `message couldn't sent to ${channelID} ${e.message}`,
                          e: e.message,
                        });
                      });
                  }

                  sendMessage();
                }
              });
            });
          } else {
            lockChannels.removeChannelLock(channelID);
            winston.info(
              `Unauthorised User tried sending message from: ${from} to channel: ${channelID}(p2p) at: ${time} (serverTime): ${Date.now()}`
            );
            ack({
              status: false,
              desc: `Sorry!!! You're not authorised to send to this inbox`,
              channelID,
            });
          }
        })
        .catch((e) => {
          lockChannels.removeChannelLock(channelID);
          winston.warn(
            `Error occured while sending new message to: ${channelID}(p2p) from: ${from} at: ${time} (serverTime): ${Date.now()} Error: ${e}`
          );
          ack({
            status: false,
            desc: `Couldn't create chat. Please try again later`,
            channelID,
            e: e.message,
          });
        });
    }
  })();
};

module.exports = sendMessage;
