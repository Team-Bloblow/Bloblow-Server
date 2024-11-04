const mongoose = require("mongoose");
const { Schema } = mongoose;

const groupSchema = new Schema({
  id: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  ownerId: {
    type: String,
    required: true,
  },
  keywordList: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
    required: false,
  },
});

module.exports = mongoose.model("group", groupSchema);
