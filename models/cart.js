const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const Schema = mongoose.Schema;

const cartSchema = new Schema(
  {
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    products: [
      {
        productId: { type: mongoose.Types.ObjectId, ref: "product" },
        quantity: { type: Number },
        title: { type: String },
        category: { type: String },
        price: { type: Number },
        units: { type: Number },
        description: { type: String },
        image: { type: String },
      },
    ],
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

cartSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Cart", cartSchema);
