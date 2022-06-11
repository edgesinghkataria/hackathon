const HTTP = require('http');
const express = require('express');

console.log('setting up HTTP server...');

const app = express();
const server = HTTP.createServer(app);

module.exports = {
  server,
  app
};