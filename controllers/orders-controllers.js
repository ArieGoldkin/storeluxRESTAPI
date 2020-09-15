const fs = require("fs");

// const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const HttpError = require("../models/http-errors");
// const Product = require("../models/product");
const User = require("../models/user");
// const Cart = require("../models/cart");
const Order = require("../models/order");

const getOrdersByUserId = async (req, res, next) => {
  const userId = req.userData.userId;
  console.log(userId);

  let userWithOrders;
  try {
    userWithOrders = await User.findById(userId).populate("orders");
  } catch (err) {
    const error = new HttpError(
      "Fetchimg orders failed, please try again.",
      500
    );
    return next(error);
  }

  if (!userWithOrders || userWithOrders.length === 0) {
    const error = new HttpError(
      "Could not find a orders for the provided user id.",
      404
    );
    return next(error);
  }
  console.log(userWithOrders);
  res.json({
    orders: userWithOrders.orders.map((order) =>
      order.toObject({ getters: true })
    ),
  });
};

const addNewOrder = async (req, res, next) => {
  const userId = req.userData.userId;
  const { items, firstName, email, address, phone, orderSummary } = req.body;

  let user;
  try {
    user = await User.findById(userId);
  } catch (err) {
    const error = new HttpError("Could not find user, please try again", 500);
    return next(error);
  }

  if (!user.address && !user.phone) {
    const error = new HttpError(
      "Could not find user shippment information",
      404
    );
    return next(error);
  }

  const createdOrder = new Order({
    creator: userId,
    products: [],
    firstName,
    email,
    shippmentAddress: address,
    contactPhone: phone,
    orderSummary,
  });

  for (var key in items) {
    if (items.hasOwnProperty(key)) {
      item = items[key];
      createdOrder.products.push(item);
    }
  }
  // console.log(createdOrder);

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdOrder.save({ session: sess });
    user.orders.push(createdOrder);
    await user.save({ session: sess });
    await sess.commitTransaction(); // on this point everything was saved in the DB
    // if something went wrong everything will roll back automaticly by mongoDB
  } catch (err) {
    const error = new HttpError(
      "Creating order failed, please try again.",
      500
    );
    return next(error);
  }

  res.status(201).json({ order: createdOrder });
};

exports.getOrdersByUserId = getOrdersByUserId;
exports.addNewOrder = addNewOrder;
