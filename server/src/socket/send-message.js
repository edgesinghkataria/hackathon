module.exports = (socket, channelID, data) => {
  socket
    .to(`${channelID}`)
    .emit("new_message", data);
};
