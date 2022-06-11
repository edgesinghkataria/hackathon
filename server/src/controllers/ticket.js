const {
  createTicketModel,
  updateTicketModel,
  mentorTickets,
  findAll,
  getTicketById,
} = require("../controllers/db-helpers/ticket");
const subjectEnum = ["FULL_STACK", "DATA_SCIENCE"];
const statusEnum = ["RESOLVED", "UNRESOLVED"];

const createTicket = async (req, res) => {
  let payload = req.body;
  const { userId } = req.params;

  const { title, description, subject, status = "UNRESOLVED" } = payload;

  if (!subjectEnum.includes(subject))
    res
      .status(400)
      .contentType("json")
      .send('Invalid subject, valid subject are "FULL_STACK", "DATA_SCIENCE"');

  if (!statusEnum.includes(status))
    res
      .status(400)
      .contentType("json")
      .send('Invalid status, valid status are "RESOLVED", "UNRESOLVED"');

  payload = {
    title,
    description,
    subject,
    userId,
    status,
  };
  console.log(payload, " payload");
  const ticket = await createTicketModel(payload);
  console.log(ticket, " ticket");
  res.status(200).contentType("json").send(ticket);
};

const updateTicket = async (req, res) => {
  const { ticketId } = req.params;
  const { title, description, subject, status, mentorId } = req.body;

  if (!subjectEnum.includes(subject))
    res
      .status(400)
      .contentType("json")
      .send('Invalid subject, valid subject are "FULL_STACK", "DATA_SCIENCE"');

  if (!statusEnum.includes(status))
    res
      .status(400)
      .contentType("json")
      .send('Invalid status, valid status are "RESOLVED", "UNRESOLVED"');

  const updatedTicket = await updateTicketModel(ticketId, req.body);
  res.status(200).contentType("json").send(updatedTicket);
};

const getTickets = async (req, res) => {
  const { limit = 10, offset = 0, userId, status } = req.query;
  let search = {};
  if (status && !statusEnum.includes(status))
    res
      .status(400)
      .contentType("json")
      .send('Invalid status, valid status are "RESOLVED", "UNRESOLVED"');
  if (userId) search["userId"] = userId;
  if (status) search["status"] = status;
  const tickets = await findAll(search, limit, offset);
  const response = { tickets };
  res.status(200).contentType("json").send(response);
};

const getMentorTickets = async (req, res) => {
  const { mentorId } = req.query;
  const tickets = await mentorTickets(mentorId);
  res.status(200).contentType("json").send(tickets);
};

const getTicket = async (req, res) => {
  const { id } = req.params;
  const ticket = await getTicketById(id);
  res.status(200).contentType("json").send(ticket);
};

module.exports = {
  createTicket,
  updateTicket,
  getTickets,
  getMentorTickets,
  getTicket,
};