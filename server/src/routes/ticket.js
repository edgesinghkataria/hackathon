"use strict";
const express = require("express");
const router = express.Router();
const {
  getTicket,
  createTicket,
  updateTicket,
  getTickets,
  getMentorTickets,
} = require("../controllers/ticket");

router.post("/create/:userId", createTicket);
router.get("/get/:id", getTicket);
router.post("/update/:ticketId", updateTicket);
router.get("/all", getTickets);
router.get("/tickets/:mentorId", getMentorTickets);

module.exports = router;