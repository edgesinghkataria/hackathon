const mongoose = require('mongoose');
const MessageSchema = require('./messages');
const { Schema } = mongoose;
const { ObjectId } = Schema;

const UserChatSchema = new Schema(
  {
    cID: { type: ObjectId, required: true },
    createdAt: { type: Number, default: Date.now() },
    bucket: { type : Number, required: true },
    count: { type : Number, required: true },
    messages: [ MessageSchema ],
  }
)

const UserChatModel = mongoose.model('userchats', UserChatSchema);

module.exports = UserChatModel;