/**
 * will setup in below sequence, will move to next only if former is resolved
 * 1. mongoDB
 * 2. redis
 * 3. socket
 * 4. start server
 */
module.exports = new Promise((resolve, reject) => {
  'use strict';

  const mongoose = require('mongoose');

  const { PORT, createMongoURL } = require('./config');

  console.log('setting up mongoDB...');
  mongoose.connect(createMongoURL(), { useNewUrlParser: true, useFindAndModify: false }, (err) => {
    if(err)
      mongooseError();
    else
      mongooseOpen();
  });

  const setupSocketIO = () => {
    const { server } = require('./config/http-server'); 
    require('./socket');
    require('./config/app');
    resolve({
      server,
      PORT
    })
  }

  function mongooseError(err) {
    reject()
    console.log(`error connecting to mongoDB, exiting node process with code 1`, err)
    process.exit(1);
  }

  function mongooseOpen() {
    setupSocketIO();
  }

})