const fs = require("fs");
const mongoose = require("mongoose");

const HttpError = require("../models/http-errors");
const Product = require("../models/product");
const User = require("../models/user");
const Message = require("../models/message");
const Order = require("../models/order");

const getOrdersByUserId = async (req, res, next) => {
  const userId = req.userData.userId;

  let userWithOrders;
  try {
    userWithOrders = await User.findById(userId).populate("orders");
  } catch (err) {
    const error = new HttpError(
      "Fetching orders failed, please try again.",
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
  let product;
  let seller;

  try {
    user = await User.findById(userId);
  } catch (err) {
    const error = new HttpError("Could not find user, please try again", 500);
    return next(error);
  }

  if (!address && !phone) {
    const error = new HttpError(
      "Could not find user shipment information",
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

  for (const key in items) {
    if (items.hasOwnProperty(key)) {
      item = items[key];
      let itemId = item.productId;

      try {
        product = await Product.findById(itemId);
        product.units -= item.quantity;
        product.sold_units += item.quantity;

        try {
          await product.save();
        } catch (err) {
          const error = new HttpError(
            "Something went wrong, could not update product.",
            500
          );
          return next(error);
        }
      } catch (err) {
        const error = new HttpError(
          "Something went wrong could not update product. please try again later.",
          500
        );
        return next(error);
      }

      createdOrder.products.push(item);
    }
    if (product.units <= 5) {
      // const usersId = product.creator;
      try {
        seller = await User.findById(product.creator);
      } catch (err) {
        const error = new HttpError(
          "Could not find user for the provided product, please try again.",
          403
        );
        return next(error);
      }

      if (!seller) {
        const error = new HttpError("Could not find user.", 404);
        return next(error);
      }

      const systemErrorMessage = new Message({
        systemNote: "Inventory",
        title: "Low quantity level",
        content: `Your product with id: ${product._id}, with title of ${product.title} has a low quantity of ${product.units}, please add more quantities or remove product from inventory.`,
        productId: product.id,
        userId: product.creator,
      });

      try {
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await systemErrorMessage.save({ session: sess });
        seller.messages.push(systemErrorMessage);
        await seller.save({ session: sess });
        await sess.commitTransaction();
      } catch (err) {
        const error = new HttpError(
          "Creating system message failed, please try again.",
          500
        );
        return next(error);
      }
    }
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdOrder.save({ session: sess });
    user.orders.push(createdOrder);
    await user.save({ session: sess });
    await sess.commitTransaction(); // on this point everything was saved in the DB
    // if something went wrong everything will roll back automatically by mongoDB
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
