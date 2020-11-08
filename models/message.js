const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const messageSchema = new Schema(
  {
    systemNote: { type: String },
    title: { type: String },
    content: { type: String },
    userId: { type: mongoose.Types.ObjectId, required: true, ref: "User" },
    productId: { type: String },
    active: {
      type: Boolean,
      default: true,
    },
    modifiedOn: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

messageSchema.index({ "$**": "text" });

module.exports = mongoose.model("Message", messageSchema);
