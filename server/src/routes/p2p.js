'use strict'
const express = require('express');
const router = express.Router();
const { getUserChatHistory, createChat } = require("../controllers/users");

router.get('/:ID/:channelID/messages', getUserChatHistory);

router.post('/:ID/chat', createChat)


module.exports = router;