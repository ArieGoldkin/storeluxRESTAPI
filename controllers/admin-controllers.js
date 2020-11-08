const fs = require("fs");

const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const strConvert = require("../middleware/helperFunctions");

const HttpError = require("../models/http-errors");
const Product = require("../models/product");
const User = require("../models/user");
const Order = require("../models/order");
const GlobalData = require("../models/globalData");
const Category = require("../models/category");
const AdminAccess = require("../middleware/adminInfo");

// GET GLOBAL DATA WHEN LOGIN
const getGlobalData = async (req, res, next) => {
  let globalData;
  try {
    globalData = await GlobalData.findOne({});
  } catch (err) {
    const error = new HttpError(
      "Fetching global data failed, please try again later.",
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

//GET ALL ORDERS
const getOrders = async (req, res, next) => {
  const { adminId } = req.body;

  let adminUser;
  let isAdmin;
  let orders;
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

  adminUser.id === AdminAccess.adminId ? (isAdmin = true) : (isAdmin = false);

  if (isAdmin) {
    try {
      orders = await Order.find({}).sort({ createdAt: -1 });
    } catch (e) {
      const error = new HttpError("Could not fine orders", 500);
      return next(error);
    }
  } else {
    const error = new HttpError("User is not admin can't do this action.", 401);
    return next(error);
  }

  res.json({
    orders: orders.map((order) => order.toObject({ getters: true })),
  });
};

// GET ALL PRODUCTS
const getAllProducts = async (req, res, next) => {
  const { adminId } = req.body;

  let products;
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

  adminUser.id === AdminAccess.adminId ? (isAdmin = true) : (isAdmin = false);

  if (isAdmin) {
    try {
      products = await Product.find({});
    } catch (err) {
      const error = new HttpError("Could not fine products", 500);
      return next(error);
    }
    if (!products) {
      return next(new HttpError("Could not find products.", 404));
    }
  } else {
    const error = new HttpError("User is not admin can't do this action.", 401);
    return next(error);
  }
  res.json({
    products: products.map((product) => product.toObject({ getters: true })),
  });
};

// GET PRODUCT BY ID
// const getProductById = async (req, res, next) => {
//   const productId = req.params.pid;

//   let product;
//   try {
//     product = await Product.findById(productId);
//   } catch (err) {
//     const error = new HttpError(
//       "Something went wrong, could not find a product.",
//       500
//     );
//     return next(error);
//   }

//   if (!product) {
//     const error = new HttpError(
//       "Could not find a product for the provided id.",
//       404
//     );
//     return next(error);
//   }

//   //getters adds the lost getter of the toObject method to the id property
//   res.json({
//     product: product.toObject({
//       getters: true,
//     }),
//   });
// };

// GET ALL ORDERS IN ADMIN ORDERS PAGE
const getOrdersByDate = async (req, res, next) => {
  const { adminId, fromDate, toDate } = req.body;

  const dateTo = new Date(toDate);

  const newDate = new Date(dateTo.setDate(dateTo.getDate() + 1));
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

  adminUser.id === AdminAccess.adminId ? (isAdmin = true) : (isAdmin = false);

  if (isAdmin) {
    try {
      orders = await Order.find({
        createdAt: { $gte: fromDate, $lte: newDate },
      }).sort({ createdAt: -1 });
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

//GET ORDERS BY USER NAME
const getOrdersByUserName = async (req, res, next) => {
  const { adminId, userName } = req.body;

  let orders;
  let user;
  let adminUser;
  let isAdmin;
  let newOrdersArray = [];

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
      "Could not find admin user for provided id, user not allowed to this route.",
      401
    );
    return next(error);
  }

  adminUser.id === AdminAccess.adminId ? (isAdmin = true) : (isAdmin = false);

  if (isAdmin) {
    if (userName) {
      try {
        user = await User.find({
          $or: [
            { firstName: { $regex: userName, $options: "i" } },
            { lastName: { $regex: userName, $options: "i" } },
          ],
        });
      } catch (err) {
        const error = new HttpError("No users found.", 500);
        return next(error);
      }

      for (let key in user) {
        oneItem = user[key];
        let userId = oneItem._id;
        try {
          orders = await Order.find({ creator: userId }).sort({
            createdAt: -1,
          });
          newOrdersArray.push(...orders);
        } catch (err) {
          const error = new HttpError("Could not fine orders", 500);
          return next(error);
        }
      }
    } else {
      try {
        orders = await Order.find({}).sort({ createdAt: -1 });
        newOrdersArray.push(...orders);
      } catch (e) {
        const error = new HttpError("Could not fine orders", 500);
        return next(error);
      }
    }
  } else {
    const error = new HttpError("User is not admin can't do this action.", 401);
    return next(error);
  }

  res.json({
    orders: newOrdersArray.map((order) => order.toObject({ getters: true })),
  });
};

// UPDATE RATE CHANGE
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
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, check connection and try again.",
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

  adminUser.id === AdminAccess.adminId ? (isAdmin = true) : (isAdmin = false);

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
        "Something went wrong, could not update global vat rate.",
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

// DELETE REQUESTED PRODUCTS
const deleteProducts = async (req, res, next) => {
  const { products, adminId } = req.body;

  let adminUser;
  let isAdmin;

  try {
    adminUser = await User.findById(adminId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, check connection and try again.",
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

  adminUser.id === AdminAccess.adminId ? (isAdmin = true) : (isAdmin = false);

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

// CREATING NEW CATEGORY
const createCategory = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new HttpError(
      "Invalid inputs passed, please check your data.",
      422
    );
    return next(error);
  }

  const { name, adminId } = req.body;
  let category;
  let adminUser;
  let isAdmin;

  let newNameStr = strConvert.capitalize(name);

  try {
    adminUser = await User.findById(adminId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, check connection and try again.",
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

  adminUser.id === AdminAccess.adminId ? (isAdmin = true) : (isAdmin = false);

  if (isAdmin) {
    try {
      category = await Category.find({ name: newNameStr });
    } catch (e) {
      const error = new HttpError(
        "Something went wrong, could not find category.",
        500
      );
      return next(error);
    }

    if (category.length > 0) {
      const error = new HttpError(
        "Creating category failed, category already exists.",
        422
      );
      return next(error);
    }

    const createdCategory = new Category({
      name: newNameStr,
    });

    try {
      const sess = await mongoose.startSession();
      sess.startTransaction();
      createdCategory.save({ session: sess });
      await sess.commitTransaction();
    } catch (err) {
      const error = new HttpError(
        "Creating category failed, please try again.",
        500
      );
      return next(error);
    }
    res.status(201).json({ category: createdCategory });
  } else {
    const error = new HttpError("User is not admin can't do this action.", 401);
    return next(error);
  }
};

//CHANGE PRODUCT STATUS
const productStatusChange = async (req, res, next) => {
  const { adminId, productId } = req.body;

  let adminUser;
  let isAdmin;
  let product;
  let user;

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

  adminUser.id === AdminAccess.adminId ? (isAdmin = true) : (isAdmin = false);

  if (isAdmin) {
    try {
      product = await Product.findById(productId);
    } catch (err) {
      const error = new HttpError(
        "Something went wrong, could not find product.",
        500
      );
      return next(error);
    }
    try {
      user = await User.findById(product.creator);
    } catch (err) {
      const error = new HttpError(
        "Creating product failed, please try again",
        500
      );
      return next(error);
    }

    if (!user) {
      const error = new HttpError("Could not find user for provided id", 404);
      return next(error);
    }
    if (product.active === true) {
      product.active = false;
      try {
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await product.save({
          session: sess,
        });
        user.products.pull(product);
        await user.save({ session: sess });
        await sess.commitTransaction();
      } catch (err) {
        const error = new HttpError(
          "Something went wrong, could not update product.",
          500
        );
        return next(error);
      }
    } else {
      product.active = true;
      try {
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await product.save({
          session: sess,
        });
        user.products.push(product);
        await user.save({ session: sess });
        await sess.commitTransaction();
      } catch (err) {
        const error = new HttpError(
          "Something went wrong, could not update product.",
          500
        );
        return next(error);
      }
    }
  } else {
    const error = new HttpError("User is not admin can't do this action.", 401);
    return next(error);
  }
  res.status(200).json({
    product: product.toObject({ getters: true }),
  });
};

exports.getOrders = getOrders;
exports.getGlobalData = getGlobalData;
exports.getOrdersByDate = getOrdersByDate;
exports.getOrdersByUserName = getOrdersByUserName;
exports.updateRate = updateRate;
exports.deleteProducts = deleteProducts;
exports.createCategory = createCategory;
exports.getAllProducts = getAllProducts;
exports.productStatusChange = productStatusChange;
