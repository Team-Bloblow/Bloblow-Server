const mongoose = require("mongoose");
const { Schema } = mongoose;

const groupSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  ownerId: {
    type: String,
    required: true,
  },
  keywordList: {
    type: Array,
    required: true,
  },
},
{
  timestamps: true
});

module.exports = mongoose.model("group", groupSchema);
