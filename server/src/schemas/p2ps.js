const mongoose = require('mongoose');

const { Schema } = mongoose;
const { ObjectId } = Schema;

const P2PSchema = new Schema(
  {
    _id: { type: ObjectId, ref: 'userchats', required: true },
    members: [ { type: ObjectId, require: true, ref: 'users' } ],
    cBucket: { type: Number, required: true },
    isBlocked: { type: Boolean, default: false },
  }
)

const P2PSchemaModel = mongoose.model('p2ps', P2PSchema);

module.exports = P2PSchemaModel;