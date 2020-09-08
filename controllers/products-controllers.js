const fs = require("fs");

const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const HttpError = require("../models/http-errors");
const Product = require("../models/product");
const User = require("../models/user");
const Cart = require("../models/cart");
const { compareSync } = require("bcryptjs");

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

const addProductToCart = async (req, res, next) => {
  const {
    productId,
    quantity,
    title,
    category,
    price,
    units,
    description,
    image,
  } = req.body;

  let user;
  try {
    user = await User.findById(req.userData.userId);
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

  let cartId = user.cartId;
  let createdCart;
  let cart;

  // checking if the cartId object is empty and there is no cart
  if (Object.keys(cartId).length == 0) {
    createdCart = new Cart({
      creator: req.userData.userId,
      products: [
        {
          productId,
          quantity,
          title,
          category,
          price,
          units,
          description,
          image,
        },
      ],
    });
  } else {
    try {
      cart = await Cart.findById(cartId);

      let id = productId;
      let itemIndex = cart.products.findIndex((p) => p.productId == id);
      if (itemIndex > -1) {
        //product exists in the cart, update the quantity
        let productItem = cart.products[itemIndex];
        productItem.quantity = quantity;
        productItem.title = title;
        productItem.category = category;
        productItem.price = price;
        productItem.units = units;
        productItem.description = description;
        productItem.image = image;
        cart.products[itemIndex] = productItem;
      } else {
        //product does not exists in cart, add new item
        cart.products.push({
          productId,
          quantity,
          title,
          category,
          price,
          units,
          description,
          image,
        });
      }

      await cart.save();
      return res.status(201).json({ cart: cart.toObject({ getters: true }) });
    } catch (err) {
      const error = new HttpError(
        "Creating or update product cart faild, please try again",
        500
      );
      return next(error);
    }
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdCart.save({ session: sess });
    user.cartId.push(createdCart);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Adding product to cart faild, please try again",
      500
    );
    return next(error);
  }

  res.status(201).json({ cart: createdCart });
};

const getCartByUserId = async (req, res, next) => {
  const userId = req.userData.userId;

  let userWithCart;
  let userCart;
  let createdCart;
  try {
    userWithCart = await User.findById(userId);

    // if there is no cart then create an empty cart
    if (Object.keys(userWithCart.cartId).length == 0) {
      createdCart = new Cart({
        creator: userId,
        products: [],
      });
      try {
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await createdCart.save({ session: sess });
        userWithCart.cartId.push(createdCart);
        await userWithCart.save({ session: sess });
        await sess.commitTransaction();
      } catch (err) {
        const error = new HttpError(
          "Adding product to cart faild, please try again",
          500
        );
        return next(error);
      }
    }
    userCart = await Cart.findById(userWithCart.cartId);
  } catch (err) {
    const error = new HttpError(
      "Fetching cart failed, please try again later or try to login.",
      500
    );
    return next(error);
  }

  if (!userCart || userCart.length === 0) {
    const error = new HttpError(
      "Could not find a cart for the provided user id.",
      404
    );
    return next(error);
  }

  res.json({
    cart: userCart.products.map((product) =>
      product.toObject({ getters: true })
    ),
  });
};

const updateProductInCart = async (req, res, next) => {
  const userId = req.userData.userId;
  const { productId, quantity } = req.body;

  let user;
  let product;
  let userCart;
  try {
    user = await User.findById(userId);
    userCart = await Cart.findById(user.cartId);
    product = userCart.products.find((p) => p.id == productId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find product.",
      500
    );
    return next(error);
  }

  if (!product) {
    const error = new HttpError("Could not find product for this id.", 404);
    return next(error);
  }

  product.quantity = quantity;
  try {
    await userCart.save();
  } catch (err) {
    const error = new HttpError(
      "Somthing went wrong, could not update product.",
      500
    );
    return next(error);
  }
  res.json({
    cart: userCart.products.map((product) =>
      product.toObject({ getters: true })
    ),
  });
};

const deleteProductFromCart = async (req, res, next) => {
  // const { productId } = req.body;
  const productId = req.params.pcid;
  const userId = req.userData.userId;

  let product;
  let user;
  let userCart;
  try {
    user = await User.findById(userId);
    userCart = await Cart.findById(user.cartId);

    product = userCart.products.find((p) => p.id == productId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete product from cart.",
      500
    );
    return next(error);
  }

  if (!product) {
    const error = new HttpError("Could not find product for this id.", 404);
    return next(error);
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await product.remove({
      session: sess,
    });
    userCart.products.pull(product);
    await userCart.save({
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
    description,
    creator: req.userData.userId,
    image: req.file.path,
  });

  let user;

  try {
    user = await User.findById(req.userData.userId);
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
      "Somthing went wrong, could not update product.",
      500
    );
    return next(error);
  }

  res.status(200).json({
    product: product.toObject({ getters: true }),
  });
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

  // deleting the image from data base when deleting a product
  fs.unlink(imagePath, (err) => {
    console.log(err);
  });

  res.status(200).json({
    message: "Deleted product.",
  });
};

exports.getProducts = getProducts;
exports.getProductById = getProductById;
exports.getProductsByUserId = getProductsByUserId;
exports.createProduct = createProduct;
exports.updateProduct = updateProduct;
exports.deleteProduct = deleteProduct;
exports.addProductToCart = addProductToCart;
exports.getCartByUserId = getCartByUserId;
exports.deleteProductFromCart = deleteProductFromCart;
exports.updateProductInCart = updateProductInCart;
