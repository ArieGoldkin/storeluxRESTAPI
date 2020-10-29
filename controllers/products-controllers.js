const fs = require("fs");

const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const HttpError = require("../models/http-errors");
const Product = require("../models/product");
const User = require("../models/user");

// GET ALL PRODUCTS
const getProducts = async (req, res, next) => {
  let products;
  try {
    products = await Product.find({ active: true });
  } catch (err) {
    const error = new HttpError("Could not fine products", 500);
    return next(error);
  }
  if (!products) {
    return next(new HttpError("Could not find products.", 404));
  }
  res.json({
    products: products.map((product) => product.toObject({ getters: true })),
  });
};

//FIND PRODUCTS BY TITLE
const findProductsByTitle = async (req, res, next) => {
  const { title } = req.body;
  let products;

  if (title) {
    try {
      products = await Product.find({
        $and: [{ title: { $regex: title, $options: "i" } }, { active: true }],
      });
    } catch (err) {
      const error = new HttpError("Could not fine products", 500);
      return next(error);
    }
  } else {
    try {
      products = await Product.find({ active: true });
    } catch (err) {
      const error = new HttpError(
        "Something happened, Could not fine products",
        500
      );
      return next(error);
    }
  }

  if (!products) {
    return res.json({ products });
  }
  res.json({
    products: products.map((product) => product.toObject({ getters: true })),
  });
};

// FIND PRODUCTS BY CATEGORY
const findProductsByCategory = async (req, res, next) => {
  const { category } = req.body;

  if (!category || category === "Select Category") {
    const error = new HttpError(
      "Please select a category before searching products.",
      400
    );
    return next(error);
  }

  let products;
  try {
    products = await Product.find({
      $and: [{ category: category }, { active: true }],
    });
  } catch (err) {
    const error = new HttpError("Could not fine products", 500);
    return next(error);
  }

  if (!products) {
    return res.json({ products });
  }

  res.json({
    products: products.map((product) => product.toObject({ getters: true })),
  });
};

// GET PRODUCT BY ID
const getProductById = async (req, res, next) => {
  const productId = req.params.pid;

  let product;
  try {
    product = await Product.findById(productId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find a product.",
      500
    );
    return next(error);
  }

  if (!product) {
    const error = new HttpError(
      "Could not find a product for the provided id.",
      404
    );
    return next(error);
  }

  //getters adds the lost getter of the toObject method to the id property
  res.json({
    product: product.toObject({
      getters: true,
    }),
  });
};

// GET ALL USER PRODUCTS BY USER ID
const getProductsByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  let userWithProducts;
  try {
    userWithProducts = await User.findById(userId).populate({
      path: "products",
      match: { active: true },
    });
  } catch (err) {
    const error = new HttpError(
      "Fetching products failed, please try again later or try to login.",
      500
    );
    return next(error);
  }

  //if(!products || products.length === 0) {
  if (!userWithProducts || userWithProducts.length === 0) {
    const error = new HttpError(
      "Could not find a products for the provided user id.",
      404
    );
    return next(error);
  }

  res.json({
    products: userWithProducts.products.map((product) =>
      product.toObject({ getters: true })
    ),
  });
};

// CREATE NEW PRODUCT
const createProduct = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new HttpError(
      "Invalid inputs passed, please check your data.",
      422
    );
    return next(error);
  }
  console.log(req.body);
  const { title, category, price, units, description } = req.body;

  const createdProduct = new Product({
    title,
    category,
    price,
    units,
    sold_units: 0,
    description,
    creator: req.userData.userId,
    image: req.file.path,
  });

  let user;

  try {
    user = await User.findById(req.userData.userId);
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

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdProduct.save({ session: sess });
    user.products.push(createdProduct);
    await user.save({ session: sess });
    await sess.commitTransaction(); // on this point everything was saved in the DB
    // if something went wrong everything will roll back automatically by mongoDB
  } catch (err) {
    const error = new HttpError(
      "Creating product failed, please try again.",
      500
    );
    return next(error);
  }

  res.status(201).json({ product: createdProduct.toObject({ getters: true }) });
};

// UPDATE PRODUCT
const updateProduct = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new HttpError("Invalid inputs passed, please check your data.", 422);
  }

  const { title, category, price, units, image, description } = req.body;
  const productId = req.params.pid;

  let product;
  try {
    product = await Product.findById(productId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find product.",
      500
    );
    return next(error);
  }

  // checking if the user that wants to update product is the correct user that is logged in.
  if (product.creator.toString() !== req.userData.userId) {
    const error = new HttpError(
      "Yoy are not allowed to edit this product.",
      401
    );
    return next(error);
  }

  const imagePath = image; // current image path

  product.title = title;
  product.category = category;
  product.price = price;
  product.units = units;
  product.description = description;
  try {
    if (product.image !== imagePath) {
      // deleting the prev image from data base when update a product if update image require
      fs.unlinkSync(product.image);
      product.image = req.file.path;
    } else {
      product.image = image;
    }
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not change image.",
      500
    );
    return next(error);
  }

  try {
    await product.save();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update product.",
      500
    );
    return next(error);
  }

  res.status(200).json({
    product: product.toObject({ getters: true }),
  });
};

// DELETE PRODUCT
const deleteProduct = async (req, res, next) => {
  const productId = req.params.pid;

  let product;
  try {
    // the populate method refs the document to another collection to work with ('creator') is the relation between the documents
    product = await Product.findById(productId).populate("creator");
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete product.",
      500
    );
    return next(error);
  }

  if (!product) {
    const error = new HttpError("Could not find product for this id.", 404);
    return next(error);
  }

  // checking if the user that wants to delete current product is the correct user that is logged in.
  if (product.creator.id !== req.userData.userId) {
    const error = new HttpError(
      "Yoy are not allowed to delete this product.",
      401
    );
    return next(error);
  }

  const imagePath = product.image;
  product.active = false;
  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await product.updateOne({ active: false }, { session: sess });
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
  res.status(200).json({
    message: "Deleted product.",
  });
};

exports.getProducts = getProducts;
exports.findProductsByTitle = findProductsByTitle;
exports.findProductsByCategory = findProductsByCategory;
exports.getProductById = getProductById;
exports.getProductsByUserId = getProductsByUserId;
exports.createProduct = createProduct;
exports.updateProduct = updateProduct;
exports.deleteProduct = deleteProduct;
