const mongoose = require("mongoose");
const { Schema } = mongoose;

const groupSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    ownerId: {
      type: String,
      required: true,
    },
    keywordIdList: [
      {
        type: Schema.Types.ObjectId,
        ref: "keyword",
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("group", groupSchema);
