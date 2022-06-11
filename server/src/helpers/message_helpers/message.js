const validateMessage = require('./validateMessages');

const generateMessage = (userID, username, channelID, text, time, type, image, name, chatType, invitationDetails, post) => ({
  channelID,
  userID,
  username,
  name,
  text: (''+text).trim(),
  time,
  type,
  image,
  chatType,
  post,
  invitationDetails:  invitationDetails
});

module.exports = generateMessage;
