const jwt = require("jsonwebtoken");

const HttpError = require("../models/http-errors");

module.exports = (req, res, next) => {
  if (req.method === "OPTIONS") {
    return next();
  }
  try {
    // Authorization: 'Bearer TOKEN'/ it is an array of string and we need the second string
    const token = req.headers.authorization.split(" ")[1];
    if (!token) {
      throw new Error("Authentication faild!");
    }
    const decodedToken = jwt.verify(
      token,
      "supersecret_string_gold_dont_share"
    );
    req.userData = { userId: decodedToken.userId };
    next();
  } catch (err) {
    const error = new HttpError("Authentication faild!", 403);
    return next(error);
  }
};
