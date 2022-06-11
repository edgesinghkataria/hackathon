"use strict";
const io = require("../socket/io");
const { MESSAGES_SEEN } = require("../constants/api-to-socket");
const Errors = require("../customErrors.js");
const {
  create_chat,
  create_user,
  getUserChats,
} = require("./helpers/users");
const {
  areParametersValid,
  isObjectIdValid,
  isStringEqual,
} = require("../helpers/utility-functions");
const responseGenerator = require("../helpers/message_helpers");
const api_to_socket_actions = require("../socket/handlers/api-to-socket-actions");

async function createAUser (req, res) {
  try {
    const data = req.body,
      name = data.name,
      socket = data.socketID,
      mentorKey = data.mentorKey

    //validating all the parameters
    if (!areParametersValid(name, socket, String))
      throw new Errors.InvalidParams();

    const socketID = io.sockets.connected[socket];

    //checking if the socket is online
    if (!socketID)
      throw new Errors.InvalidSocket();

    const responseData = await create_user(
      name,
      socketID,
      mentorKey,
    );
    res.status(200).contentType("json").send(responseData);
  } catch (error) {
    console.log(error);
    res.status(400).contentType("json").send(responseGenerator.error(error));
  }
};

async function getChatList (req, res) {
  let userID = req.params.ID,
    offset = +req.query.offset || 0,
    limit = +req.query.limit || 20;

  if (
    !areParametersValid(userID, limit, offset, [String, Number, Number]) ||
    !isObjectIdValid(userID)
  )
    return res
      .status(400)
      .contentType("json")
      .send({ status: false, desc: "Required parameters not provided." });

  if (limit < 0 || offset < 0)
    return res
      .status(400)
      .contentType("json")
      .send({ status: false, desc: "Send positive numb  er in limit/offset" });

  getUserChats(userID, offset, limit)
    .then((data) => {
      res.contentType("json").status(200).send(data);
      sendOnlineUsers(`${data.userID}`);
    })
    .catch((e) => {
      console.log(e);
      res.contentType("json").status(e.statusCode).send(e.data);
    });
};

async function createChat(req, res){
  try {
    const data = req.body,
    from = req.params.ID,
    to = data.userID;

    if (
      !areParametersValid(from, to, String) ||
      isStringEqual(from, to) ||
      !(isObjectIdValid(from) && isObjectIdValid(to))
    )
    throw new Errors.InvalidParams();

    const responseData = await create_chat(from, to);

    res.status(200).contentType("json").send(responseData)
  } catch (error) {
    console.log(error);
    res.status(400).contentType("json").send(responseGenerator.error(error));
  }
};

const getUserChatHistory = async (req, res) => {
  try {
    let requester = req.params.ID,
      channelID = req.params.channelID,
      userID = req.query.userID,
      limit = +req.query.limit,
      offset = +req.query.offset;

    if (
      !areParametersValid(requester, channelID || userID, limit, offset, [
        String,
        String,
        Number,
        Number,
      ]) ||
      !isObjectIdValid(requester) ||
      (!isObjectIdValid(userID) && !isObjectIdValid(channelID))
    )
      throw new Errors.InvalidParams();

    const responseData = await getP2pChatHistory(
      requester,
      channelID,
      userID,
      limit,
      offset
    );
    responseData.channelID &&
      api_to_socket_actions(
        { channelID: responseData.channelID, userID: responseData._id },
        MESSAGES_SEEN
      );
    Reflect.deleteProperty(responseData, "_id");
    res
      .status(200)
      .contentType("json")
      .send({ status: true, data: responseData });
  } catch (error) {
    console.error(error);
    res
      .status(400)
      .contentType("json")
      .send({ status: false, msg: error.name });
  }
};

module.exports = {
  createAUser,
  createChat,
  getChatList,
  getUserChatHistory,
};
