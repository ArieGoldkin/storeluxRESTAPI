const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const HttpError = require("../models/http-errors");
const Product = require("../models/product");
const User = require("../models/user");

const getProducts = async (req, res, next) => {
  let products;
  try {
    products = await Product.find({});
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

  //getters adds the lost getter of the toObject method to the id proprety
  res.json({
    product: product.toObject({
      getters: true,
    }),
  });
};

const getProductsByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  // let products;
  let userWithProducts;
  try {
    userWithProducts = await User.findById(userId).populate("products");
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

const createProduct = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new HttpError(
      "Invalid inputs passed, please check your data.",
      422
    );
    return next(error);
  }

  const { title, category, price, units, description, creator } = req.body;
  const createdProduct = new Product({
    title,
    category,
    price,
    units,
    description,
    creator,
    image:
      "https://cdn.azrieli.com/Images/2cf3011b-8d3d-429d-8ea9-04e5b9bd47de/Normal/c1f68a04.jpg",
  });

  let user;

  try {
    user = await User.findById(creator);
  } catch (err) {
    const error = new HttpError(
      "Creating product faild, please try again",
      500
    );
    return next(error);
  }

  if (!user) {
    const error = new HttpError("Could not find user for provided id", 404);
    return next(error);
  }

  console.log(user);

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdProduct.save({ session: sess });
    user.products.push(createdProduct);
    await user.save({ session: sess });
    await sess.commitTransaction(); // on this point everything was saved in the DB
    // if something went wrong everything will roll back automaticly by mongoDB
  } catch (err) {
    const error = new HttpError(
      "Creating product failed, please try again.",
      500
    );
    return next(error);
  }

  res.status(201).json({ product: createdProduct });
};

const updateProduct = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new HttpError("Invalid inputs passed, please check your data.", 422);
  }

  const { title, category, price, units, description } = req.body;
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

  product.title = title;
  product.category = category;
  product.price = price;
  product.units = units;
  product.description = description;

  try {
    await product.save();
  } catch (err) {
    const error = new HttpError(
      "Somthing went wrong, could not update product.",
      500
    );
    return next(error);
  }

  res.status(200).json({ product: product.toObject({ getters: true }) });
};

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
    const error = new HttpError("Could not find place for this id.", 404);
    return next(error);
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await product.remove({ session: sess });
    product.creator.products.pull(product); // pulls the product id from the products user array
    await product.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete product.",
      500
    );
    return next(error);
  }

  res.status(200).json({ message: "Deleted product." });
};

exports.getProducts = getProducts;
exports.getProductById = getProductById;
exports.getProductsByUserId = getProductsByUserId;
exports.createProduct = createProduct;
exports.updateProduct = updateProduct;
exports.deleteProduct = deleteProduct;
