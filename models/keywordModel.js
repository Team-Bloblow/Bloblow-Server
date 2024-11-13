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
      type: String,
    },
    excludedKeyword: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("keyword", keywordSchema);
