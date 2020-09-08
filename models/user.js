const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, minlength: 6 },
  address: { type: String },
  phone: { type: String },
  image: { type: String },
  cartId: [{ type: mongoose.Types.ObjectId, ref: "Cart" }],

  // the array means that the user can have more than one product
  products: [{ type: mongoose.Types.ObjectId, required: true, ref: "Product" }],
  orders: [{ type: mongoose.Types.ObjectId, required: true, ref: "Order" }],
});

userSchema.plugin(uniqueValidator);

module.exports = mongoose.model("User", userSchema);
