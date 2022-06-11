const mongoose = require('mongoose');

const { Schema } = mongoose;
const { ObjectId } = Schema;

const MessageSchema = new Schema(
  {
    from: { type: ObjectId, required: true, ref: 'users' },
    to: { type: ObjectId, required: true, ref: 'users' },
    type: { type: String, required: true, enum: ['text', 'ticket'] },
    text: { type: String, required: true, trim: true },
    time: { type: Number, required: true },
  }
)

module.exports = MessageSchema;