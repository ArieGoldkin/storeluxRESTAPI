const { validationResult } = require("express-validator");

const HttpError = require("../models/http-errors");
const User = require("../models/user");

const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, "-password");
  } catch (err) {
    const error = new HttpError(
      "Fetching users faild, please try again later.",
      500
    );
    return next(error);
  }

  res.json({ users: users.map((user) => user.toObject({ getters: true })) });
};

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
      "User exists already, please login insted.",
      422
    );
    return next(error);
  }

  const defaultImagePath = "uploads\\images\\user.png";

  const createdUser = new User({
    firstName,
    lastName,
    email,
    image: defaultImagePath,
    password,
    products: [],
  });

  try {
    await createdUser.save();
  } catch (err) {
    const error = new HttpError("Signing up failed, please try again.", 500);
    return next(error);
  }

  res.status(201).json({ user: createdUser.toObject({ getters: true }) });
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  let existingUser;

  try {
    existingUser = await User.findOne({ email });
  } catch (err) {
    const error = new HttpError(
      "Logging in failed, please try again later",
      500
    );
    return next(error);
  }

  if (!existingUser || existingUser.password != password) {
    const error = new HttpError(
      "Invalid email or password, could not login.",
      401
    );
    return next(error);
  }

  res.json({
    message: "Logged in!",
    user: existingUser.toObject({ getters: true }),
  });
};

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

const updateUserInfo = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new HttpError("Invalid inputs passed, please check your data.", 422);
  }
  const { firstName, lastName, email, address, image, phone } = req.body;

  const defaultImagePath = "uploads\\images\\user.png";
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

  user.firstName = firstName;
  user.lastName = lastName;
  user.email = email;
  user.address = address;
  user.phone = phone;
  try {
    if (image != defaultImagePath) {
      user.image = req.file.path;
    } else {
      user.image = defaultImagePath;
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
      "Somthing went wrong, could not update user.",
      500
    );
    return next(error);
  }

  res.status(200).json({ user: user.toObject({ getters: true }) });
};

exports.getUsers = getUsers;
exports.getUserById = getUserById;
exports.updateUserInfo = updateUserInfo;
exports.signup = signup;
exports.login = login;
