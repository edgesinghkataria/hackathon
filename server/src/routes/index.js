'use strict'
const express = require('express');
const user = require('./user')
const ticket = require('./ticket')
const varifyJWT = require('../helpers/jwt_helper/')
const winston = require('winston');

const api = express.Router();

api.use('/_health', (req, res) => {
  res.status(200).send({status: 'ok'});
})

if(process.env.NODE_ENV === 'production')
  api.use((req, res, next) => {

    let token = req.headers.authorization;
    
    const { playerID, username } = req.body;
    winston.info({ message: 'LOGIN ATTEMPT', playerID, username, token })

    // if token is falsy
    if(!token)
      return res.status(400).contentType('json').send({status: false, data: { message: 'bad request', desc: 'Authorisation token is missing.' } })

    // if token is found
    token = token.split(' ');

    // if bearer is not passed
    if(token[0] !== 'Bearer')
      return res.status(400).contentType('json').send({status: false, data: { message: 'bad request', desc: 'Only accept bearer token' } })
    
    token = token[1];

    // varifying JWT
    varifyJWT(token)
    // proceed with resolved
    .then(() => next())
    // send failure if rejected
    .catch(e => {
      res.status(400).contentType('json').send({status: false, data: { message: 'bad request', desc: 'Varify authorisation token.' } })
    })
  })

api.use('/user', user);
api.use('/ticket', ticket);

module.exports = api