const TicketModel = require("../../schemas/ticket");

const createTicketModel = (data) =>
  new Promise((resolve, reject) => {
    TicketModel.create(data)
      .then((res) => resolve(res))
      .catch((err) => reject(err));
  });

const updateTicketModel = (_id, data) =>
  new Promise((resolve, reject) => {
    TicketModel.updateOne({ _id }, data, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });

const findAll = (search, limit, offset) =>
  new Promise((resolve, reject) => {
    TicketModel.find(search)
      .skip(offset)
      .limit(limit)
      .then((data) => resolve(data))
      .catch((e) => reject(e));
  });

const mentorTickets = (mentorId) =>
  new Promise((resolve, reject) => {
    TicketModel.find({ mentorId })
      .then((data) => resolve(data))
      .catch((e) => reject(e));
  });

const getTicketById = (id) =>
  new Promise((resolve, reject) => {
    TicketModel.findById(id)
      .then((data) => resolve(data))
      .catch((e) => reject(e));
  });
module.exports = {
  findAll,
  mentorTickets,
  getTicketById,
  updateTicketModel,
  createTicketModel,
};