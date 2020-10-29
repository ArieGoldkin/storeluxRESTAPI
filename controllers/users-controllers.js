const crypto = require("crypto");

const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const sendgridTransport = require("nodemailer-sendgrid-transport");
const adminAccess = require("../middleware/adminInfo");

const transporter = nodemailer.createTransport(
  sendgridTransport({
    auth: {
      api_key: `${process.env.MAIL_API_KEY}`,
    },
  })
);

// MODELS IMPORT FOR USE
const HttpError = require("../models/http-errors");
const User = require("../models/user");
const Order = require("../models/order");
const Product = require("../models/product");

// GET ALL USERS
const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, "-password");
  } catch (err) {
    const error = new HttpError(
      "Fetching users failed, please try again later.",
      500
    );
    return next(error);
  }

  res.json({ users: users.map((user) => user.toObject({ getters: true })) });
};

// need to fix email sign up when email contains . or other signs
//SIGNUP
const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new HttpError(
      "Invalid inputs passed, please check your data.",
      422
    );
    return next(error);
  }

  const { firstName, lastName, email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email });
  } catch (err) {
    const error = new HttpError(
      "Signing up failed, please try again later",
      500
    );
    return next(error);
  }

  if (existingUser) {
    const error = new HttpError(
      "User exists already, please login instead.",
      422
    );
    return next(error);
  }

  const defaultImagePath = "uploads\\images\\user.png";

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    const error = new HttpError("Could not create user, please try again", 500);
    return next(error);
  }

  const createdUser = new User({
    firstName,
    lastName,
    email,
    image: defaultImagePath,
    password: hashedPassword,
    products: [],
  });

  try {
    await createdUser.save();
  } catch (err) {
    const error = new HttpError("Signing up failed, please try again.", 500);
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      { userId: createdUser.id, email: createdUser.email },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (err) {
    const error = new HttpError("Signing up failed, please try again.", 500);
    return next(error);
  }

  res.status(201).json({
    userId: createdUser.id,
    email: createdUser.email,
    token: token,
  });

  try {
    const mail = await transporter.sendMail({
      to: email,
      from: "storeluxonlineshop@gmail.com",
      subject: "Signup succeeded!",
      html: "<h1>You successfully signed up!, welcome!</h1>",
    });
    console.log(email);
    console.log(mail);
  } catch (err) {
    const error = new HttpError("Something went wrong, please try again.", 500);
    return next(error);
  }
};

//FORGOT PASSWORD RECOVERY EMAIL SEND
const resetPassword = async (req, res, next) => {
  const { email } = req.body;

  let existingUser;

  try {
    existingUser = await User.findOne({ email });
  } catch (e) {
    const error = new HttpError(
      "Something went wrong, please try again..",
      500
    );
    return next(error);
  }

  if (!existingUser) {
    const error = new HttpError("Could not find User.", 403);
    return next(error);
  }

  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      const error = new HttpError(
        "Something went wrong, please try again.",
        500
      );
      return next(error);
    }
    const token = buffer.toString("hex");
    existingUser.resetToken = token;
    existingUser.resetTokenExpiration = Date.now() + 3600000;
  });

  try {
    await existingUser.save();
  } catch (e) {
    const error = new HttpError(
      "Reset password failed, please try again later",
      500
    );
    return next(error);
  }

  try {
    const mail = await transporter.sendMail({
      to: email,
      from: "storeluxonlineshop@gmail.com",
      subject: "Password reset",
      html: `
          <p>Hey!!! one more set to reset your password :)</p>
          <p>Just Click this <a href="http://localhost:3000/resetPassword/${existingUser.resetToken}">link</a> to set a new password</p>
      `,
    });
  } catch (err) {
    const error = new HttpError("Something went wrong, please try again.", 500);
    return next(error);
  }
  res.status(201).json({
    email: email,
  });
};

// UPDATE NEW USER PASSWORD
const updatePassword = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new HttpError(
      "Invalid inputs passed, please check your data.",
      422
    );
    return next(error);
  }
  const { resetToken, password } = req.body;
  let user;

  try {
    user = await User.findOne({
      resetToken: resetToken,
      resetTokenExpiration: { $gt: Date.now() },
    });
  } catch (e) {
    const error = new HttpError(
      "Update password failed, Could not find user, please try again later",
      500
    );
    return next(error);
  }

  if (!user) {
    const error = new HttpError(
      "User was not found, Update password failed, please try again.",
      422
    );
    return next(error);
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    const error = new HttpError(
      "Could not create encrypt password, please try again",
      500
    );
    return next(error);
  }

  user.password = hashedPassword;
  user.resetToken = undefined;
  user.resetTokenExpiration = undefined;

  try {
    await user.save();
  } catch (err) {
    const error = new HttpError(
      "Could not save user information, please try again.",
      500
    );
    return next(error);
  }

  res.status(201).json({
    message: "Success",
  });
};

//LOGIN
const login = async (req, res, next) => {
  const { email, password } = req.body;

  let existingUser;
  let admin;

  try {
    existingUser = await User.findOne({ email });
  } catch (err) {
    const error = new HttpError(
      "Logging in failed, please try again later",
      500
    );
    return next(error);
  }

  if (!existingUser) {
    const error = new HttpError(
      "Invalid email or password, could not login.",
      403
    );
    return next(error);
  }

  let isValidPassword = false;
  try {
    //compares the password with the hashed password in the database returns boolean value
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    const error = new HttpError(
      "Could not log in, please check your credentials and try again",
      500
    );
    return next(error);
  }

  if (!isValidPassword) {
    const error = new HttpError(
      "Invalid email or password, could not login.",
      403
    );
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      { userId: existingUser.id, email: existingUser.email },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (err) {
    const error = new HttpError("Logging in failed, please try again.", 500);
    return next(error);
  }

  existingUser.id === adminAccess.adminId
    ? (admin = "admin")
    : (admin = "notAdmin");

  res.json({
    userId: existingUser.id,
    email: existingUser.email,
    token: token,
    admin: admin,
  });
};

// GET USERS PERSONAL PRODUCTS
const getUserPersonalProducts = async (req, res, next) => {
  const { userId } = req.body;

  let userProducts;
  let userWithProducts;
  try {
    userWithProducts = await User.findById(userId).populate({
      path: "products",
      match: { active: true },
    });
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find a user.",
      500
    );
    return next(error);
  }

  if (!userWithProducts) {
    const error = new HttpError(
      "Could not find a user for the provided id.",
      404
    );
    return next(error);
  }
  res.json({
    items: userWithProducts.products.map((product) =>
      product.toObject({ getters: true })
    ),
  });
};

//GET USER BY ID
const getUserById = async (req, res, next) => {
  const userId = req.params.uid;

  let user;
  try {
    user = await User.findById(userId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find a user.",
      500
    );
    return next(error);
  }

  if (!user) {
    const error = new HttpError(
      "Could not find a user for the provided id.",
      404
    );
    return next(error);
  }

  res.json({
    user: user.toObject({
      getters: true,
    }),
  });
};

// UPDATE USER PERSONAL INFORMATION
const updateUserInfo = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new HttpError("Invalid inputs passed, please check your data.", 422);
  }
  const { email, firstName, lastName, address, image, phone } = req.body;

  const userId = req.params.uid;
  let user;

  try {
    user = await User.findById(userId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find user.",
      500
    );
    return next(error);
  }

  const imagePath = image;

  user.firstName = firstName;
  user.lastName = lastName;
  user.email = email;
  user.address = address;
  user.phone = phone;
  try {
    if (user.image !== imagePath) {
      user.image = req.file.path;
    } else {
      user.image = image;
    }
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not change image.",
      500
    );
    return next(error);
  }

  try {
    await user.save();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update user.",
      500
    );
    return next(error);
  }

  res.status(200).json({ user: user.toObject({ getters: true }) });
};

// GET USER ORDERS
const getUserOrders = async (req, res, next) => {
  const { userId } = req.body;
  let user;
  let orders;

  try {
    user = await User.findById(userId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find user.",
      500
    );
    return next(error);
  }

  if (!user) {
    const error = new HttpError(
      "Could not find a user for the provided id.",
      404
    );
    return next(error);
  }

  try {
    orders = await Order.find({ creator: userId });
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find user.",
      500
    );
    return next(error);
  }
  if (!orders) {
    const error = new HttpError("Could not find orders for this user.", 404);
    return next(error);
  }
  res.json({
    orders: orders.map((order) => order.toObject({ getters: true })),
  });
};

// GET USER ORDERS BY DATE
const getUserOrdersByDate = async (req, res, next) => {
  const { userId, fromDate, toDate } = req.body;

  const dateFrom = new Date(fromDate);
  const dateTo = new Date(toDate);
  const newDate = new Date(dateTo.setDate(dateTo.getDate() + 1));

  let orders;
  let user;
  try {
    user = await User.findById(userId);
  } catch (err) {
    const error = new HttpError("Could not find user for provided id", 500);
    return next(error);
  }

  if (!user) {
    const error = new HttpError("Could not find user for provided id", 404);
    return next(error);
  }

  try {
    if (
      dateFrom.getDate() === dateTo.getDate() &&
      dateFrom.getMonth() === dateTo.getMonth() &&
      dateFrom.getFullYear() === dateTo.getFullYear()
    ) {
      orders = await Order.find({ creator: userId });
    } else {
      orders = await Order.find({
        $and: [
          { creator: userId },
          { createdAt: { $gte: fromDate, $lte: newDate } },
        ],
      });
    }
  } catch (err) {
    const error = new HttpError("Could not fine orders", 500);
    return next(error);
  }

  if (!orders) {
    return next(new HttpError("Could not find orders.", 403));
  }

  res.json({
    orders: orders.map((order) => order.toObject({ getters: true })),
  });
};

const getUserSoldItems = async (req, res, next) => {
  const { userId } = req.body;

  let products;
  let user;
  try {
    user = await User.findById(userId);
  } catch (err) {
    const error = new HttpError("Could not find user for provided id", 500);
    return next(error);
  }

  if (!user) {
    const error = new HttpError("Could not find user for provided id", 404);
    return next(error);
  }

  try {
    products = await Product.find({ creator: userId });
  } catch (e) {
    const error = new HttpError(
      "Could not find products for the current user.",
      403
    );
    return next(error);
  }
  if (!products) {
    const error = new HttpError(
      "Could not find products for the current user.",
      424
    );
    return next(error);
  }
  // console.log(products);
  const soldItemInfo = products.map((product) => {
    return {
      title: product.title,
      soldUnits: product.sold_units,
    };
  });
  res.json({
    items: soldItemInfo,
  });
};

exports.getUsers = getUsers;
exports.getUserPersonalProducts = getUserPersonalProducts;
exports.getUserById = getUserById;
exports.updateUserInfo = updateUserInfo;
exports.signup = signup;
exports.login = login;
exports.resetPassword = resetPassword;
exports.updatePassword = updatePassword;
exports.getUserOrders = getUserOrders;
exports.getUserOrdersByDate = getUserOrdersByDate;
exports.getUserSoldItems = getUserSoldItems;
