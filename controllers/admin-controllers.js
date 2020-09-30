const fs = require("fs");

const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const HttpError = require("../models/http-errors");
const Product = require("../models/product");
const User = require("../models/user");
const Order = require("../models/order");
const GlobalData = require("../models/globalData");

const getGlobalData = async (req, res, next) => {
  let globalData;
  try {
    globalData = await GlobalData.findOne({});
  } catch (err) {
    const error = new HttpError(
      "Fetching global data faild, please try again later.",
      500
    );
    return next(error);
  }

  if (!globalData) {
    const error = new HttpError("Could not find a global data.", 404);
    return next(error);
  }

  res.json({
    global: globalData.toObject({
      getters: true,
    }),
  });
  // res.json({
  //   global: globalData.map((data) => data.toObject({ getters: true })),
  // });
};

const getAllOrders = async (req, res, next) => {
  const { adminId, fromDate, toDate } = req.body;

  let orders;
  let adminUser;
  let isAdmin;

  try {
    adminUser = await User.findById(adminId);
  } catch (err) {
    const error = new HttpError(
      "Could not find admin user for provided id",
      500
    );
    return next(error);
  }

  if (!adminUser) {
    const error = new HttpError(
      "Could not find admin user for provided id",
      404
    );
    return next(error);
  }

  adminUser.id === adminId ? (isAdmin = true) : (isAdmin = false);

  if (isAdmin) {
    try {
      orders = await Order.find({
        createdAt: { $gte: fromDate, $lte: toDate },
      });
    } catch (err) {
      const error = new HttpError("Could not fine orders", 500);
      return next(error);
    }
    if (!orders) {
      return next(new HttpError("Could not find orders.", 404));
    }
  } else {
    const error = new HttpError("User is not admin can't do this action.", 401);
    return next(error);
  }

  res.json({
    orders: orders.map((order) => order.toObject({ getters: true })),
  });
};

const updateRate = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new HttpError("Invalid inputs passed, please check your data.", 422);
  }

  const { vatRate, adminId } = req.body;

  let adminUser;
  let isAdmin;
  let globalData;

  try {
    adminUser = await User.findById(adminId);
    console.log(adminUser.id);
  } catch (err) {
    const error = new HttpError(
      "Somthing went wrong, check connection and try again.",
      500
    );
    return next(error);
  }

  if (!adminUser) {
    const error = new HttpError(
      "Could not find admin user for provided id",
      404
    );
    return next(error);
  }

  adminUser.id === adminId ? (isAdmin = true) : (isAdmin = false);

  if (isAdmin) {
    try {
      globalData = await GlobalData.findOne({});
    } catch (err) {
      const error = new HttpError(
        "Something went wrong, could not find global data.",
        500
      );
      return next(error);
    }

    if (!globalData) {
      const error = new HttpError("Could not find a global data.", 404);
      return next(error);
    }
    globalData.vatRate = vatRate;
    try {
      await globalData.save();
    } catch (err) {
      const error = new HttpError(
        "Somthing went wrong, could not update global vat rate.",
        500
      );
      return next(error);
    }
  } else {
    const error = new HttpError("User is not admin can't do this action.", 401);
    return next(error);
  }

  res.status(200).json({
    globalData: globalData.toObject({ getters: true }),
  });
};

const deleteProducts = async (req, res, next) => {
  const { products, adminId } = req.body;

  let adminUser;
  let isAdmin;

  try {
    adminUser = await User.findById(adminId);
  } catch (err) {
    const error = new HttpError(
      "Somthing went wrong, check connection and try again.",
      500
    );
    return next(error);
  }

  if (!adminUser) {
    const error = new HttpError(
      "Could not find admin user for provided id",
      404
    );
    return next(error);
  }

  adminUser.id === adminId ? (isAdmin = true) : (isAdmin = false);

  let product;

  if (isAdmin) {
    for (let index in products) {
      productId = products[index];
      try {
        //find the product and related creator
        product = await Product.findById(productId).populate("creator");
      } catch (err) {
        const error = new HttpError(
          "Something went wrong, could not find product.",
          500
        );
        return next(error);
      }
      const imagePath = product.image;
      try {
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await product.remove({
          session: sess,
        });
        product.creator.products.pull(product); // pulls the product id from the products user array
        await product.creator.save({
          session: sess,
        });
        await sess.commitTransaction();
      } catch (err) {
        const error = new HttpError(
          "Something went wrong, could not delete product.",
          500
        );
        return next(error);
      }

      fs.unlink(imagePath, (err) => {
        console.log(err);
      });
    }
  } else {
    const error = new HttpError("User is not admin can't do this action.", 401);
    return next(error);
  }

  res.status(200).json({
    message: "Deleted products.",
  });
};

exports.getGlobalData = getGlobalData;
exports.getAllOrders = getAllOrders;
exports.updateRate = updateRate;
exports.deleteProducts = deleteProducts;
