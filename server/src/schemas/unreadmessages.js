const mongoose = require('mongoose');

const { Schema } = mongoose;

const MessageSchema =  new Schema(
  {
    from: { type: Schema.Types.ObjectId, required: true, ref: 'users' },
    text: { type: String, required: true },
    time: { type: Date, required: true },
    delivered: { type: Boolean, default: true }
  }
)

const UnreadMessageSchema = new Schema(
  {
    _id: { type: Schema.Types.ObjectId },
    messages: [ MessageSchema ],
    members: [ { type: Schema.Types.ObjectId, ref: 'users' } ],
    isBlocked: { type: Boolean, default: false },
    blockers: [ BlockerSchema ]
  }
)

const UnreadMessageModel = mongoose.model('unreadmessages', UnreadMessageSchema);

module.exports = UnreadMessageModel;