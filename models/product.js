const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const productSchema = new Schema(
  {
    title: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    units: { type: Number, required: true },
    description: { type: String, required: true },

    // connect the product the the creator user id
    creator: { type: mongoose.Types.ObjectId, required: true, ref: "User" },
    image: { type: String, required: true },
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

productSchema.index({ "$**": "text" });

module.exports = mongoose.model("Product", productSchema);
