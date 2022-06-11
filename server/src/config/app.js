const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const routes = require('../routes');
const { app } = require('./http-server'); 
const morgan =  require('morgan');
const winston = require('../config/winston')
const path = require('path');
const publicPath = path.join(__dirname, '../public');

//middlewares
app.use(cookieParser());
app.use(express.json({limit:'3mb'}));
app.use(cors())
app.use(morgan('combined', { stream: winston.stream }))
app.use(express.static(publicPath));
app.use('/', routes);