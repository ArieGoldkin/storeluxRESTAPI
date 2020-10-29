const fs = require("fs");

// const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const HttpError = require("../models/http-errors");
const Product = require("../models/product");
const User = require("../models/user");
const Cart = require("../models/cart");

// ADD PRODUCTS TO CART
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

  // console.log(req.body);

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

  let usersProduct = false;
  let product;
  try {
    product = await Product.findById(productId);

    for(const key in user.products){
      if(user.products[key] == product.id){
        usersProduct = true;
      }
    }

    if(usersProduct){
      const error = new HttpError(
        "This product is users product, Please check your products inventory.",
      422
      );
      return next(error);
    }
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
        // console.log(productItem);
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
      if (itemIndex === -1) {
        return res
          .status(201)
          .json({ items: cart.products.toObject({ getters: true }) });
      } else {
        return res.status(201).json({
          items: cart.products.toObject({ getters: true }),
        });
      }
    } catch (err) {
      const error = new HttpError(
        "Creating or update product cart failed, please try again",
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
      "Adding product to cart failed, please try again",
      500
    );
    return next(error);
  }
  res.status(201).json({
    items: createdCart.products.toObject({ getters: true }),
  });
};

// GET CART BY USER ID
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
          "Adding product to cart failed, please try again",
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

// UPDATE PRODUCTS IN CART
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
      "Something went wrong, could not update product.",
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

const deleteProductsFromCart = async (req, res, next) => {
  const userId = req.userData.userId;
  const { products } = req.body;

  let user;
  let userCart;
  try {
    user = await User.findById(userId);
    userCart = await Cart.findById(user.cartId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find users cart.",
      500
    );
    return next(error);
  }

  for (let key in products) {
    if (products.hasOwnProperty(key)) {
      product = products[key];
      // console.log(product);
      for (let index in userCart.products) {
        if (userCart.products.hasOwnProperty(index)) {
          userProduct = userCart.products[index];
          if (userProduct.id === product.id) {
            try {
              const sess = await mongoose.startSession();
              sess.startTransaction();
              await userProduct.remove({
                session: sess,
              });
              userCart.products.pull(userProduct);
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
          }
        }
      }
    }
  }

  res.status(200).json({
    message: "Deleted products.",
  });
};

// DELETE PRODUCT FROM CART
const deleteProductFromCart = async (req, res, next) => {
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

  res.json({
    cart: userCart.products.map((item) => item.toObject({ getters: true })),
  });
};

exports.addProductToCart = addProductToCart;
exports.getCartByUserId = getCartByUserId;
exports.updateProductInCart = updateProductInCart;
exports.deleteProductsFromCart = deleteProductsFromCart;
exports.deleteProductFromCart = deleteProductFromCart;
