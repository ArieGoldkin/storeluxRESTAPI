// const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const HttpError = require("../models/http-errors");
const Category = require("../models/category");

//GET CATEGORIES
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

exports.getCategories = getCategories;
