/**
 * will setup in below sequence, will move to next only if former is resolved
 * 1. mongoDB
 * 2. redis
 * 3. socket
 * 4. start server
 */
module.exports = async function () {
  try {
    const mongoose = require("mongoose");

    const { PORT, createMongoURL } = require("./config");

    console.log("setting up mongoDB...");
    await mongoose.createConnection(createMongoURL(), {
      useNewUrlParser: true,
      useFindAndModify: false,
    });
    console.log("mongoDB connected!");

    const { server } = require("./config/http-server");
    require("./socket");
    require("./config/app");
    return {
      server,
      PORT,
    };
  } catch (error) {
    console.error(error);
  }
};
