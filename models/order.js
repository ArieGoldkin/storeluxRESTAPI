const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const Schema = mongoose.Schema;

const orderSchema = new Schema(
  {
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    firstName: { type: String },
    email: { type: String },
    shippmentAddress: { type: String, required: true },
    contactPhone: { type: String, required: true },
    products: [
      {
        productId: { type: mongoose.Types.ObjectId, ref: "product" },
        quantity: { type: Number },
        title: { type: String },
        category: { type: String },
        price: { type: Number },
        description: { type: String },
        image: { type: String },
      },
    ],
    orderSummary: [
      {
        totalPrice: { type: Number },
        vat: { type: Number },
        totalSum: { type: Number },
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

orderSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Order", orderSchema);
