const mongoose = require("mongoose");
const { Schema } = mongoose;

const keywordSchema = new Schema(
  {
    keyword: {
      type: String,
      required: true,
    },
    ownerUid: {
      type: String,
      required: true,
    },
    includedKeyword: {
      type: Array,
    },
    excludedKeyword: {
      type: Array,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("keyword", keywordSchema);
