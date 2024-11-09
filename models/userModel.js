const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    uid: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    photoURL: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: { updatedAt: "lastSignInAt" },
  }
);

module.exports = mongoose.model("user", userSchema);
