const mongoose = require("mongoose");

const { Schema } = mongoose;
const { ObjectId } = Schema;

const ChatListSchema = new Schema({
  idModel: { type: String, required: true },
  _id: { type: ObjectId, refPath: "chats.idModel", required: true },
  member: { type: ObjectId, ref: "users", required: true },
  name: { type: String },
  type: { type: String, required: true, enum: ["p2p"] },
  cBucket: { type: Number, required: true },
  mID: { type: Number }, // last message ID
});
const UserSchema = new Schema({
  mobileNumber: { type: Number, ref: "users", required: true, },
  name: String,
  avatar: { type: String, default: "default.jpg" },
  lastSeen: Date,
  chats: [ChatListSchema],
  role: { type: String, default: "student" },
  socketId: { type: String, default: "" },
  isBlocked: { type: Boolean, default: false },
});

const UserModel = mongoose.model("users", UserSchema);

module.exports = UserModel;
