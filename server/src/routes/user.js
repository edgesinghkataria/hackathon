'use strict'
const express = require('express');
const { 
  createAUser, 
  createChat, 
  getUserChatHistory, 
  getChatList, 
} = require('../controllers/users');

const router = express.Router();

router.post('/', createAUser);

router.post('/:ID/chat', createChat);

router.get('/:ID/:channelID/messages', getUserChatHistory);

router.get('/:ID/chat', getChatList);

module.exports = router; 