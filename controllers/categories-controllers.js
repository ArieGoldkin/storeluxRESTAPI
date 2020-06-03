const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const HttpError = require("../models/http-errors");
const Category = require("../models/category");

const getCategories = async (req, res, next) => {
  let categories;
  try {
    categories = await Category.find({});
  } catch (err) {
    const error = new HttpError("Could not fine categories", 500);
    return next(error);
  }
  if (!categories) {
    return next(new HttpError("Could not find categories.", 404));
  }
  res.json({
    categories: categories.map((category) =>
      category.toObject({ getters: true })
    ),
  });
};

const createCategory = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new HttpError(
      "Invalid inputs passed, please check your data.",
      422
    );
    return next(error);
  }

  const { name } = req.body;
  const createdCategory = new Category({
    name,
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
};

exports.getCategories = getCategories;
exports.createCategory = createCategory;
