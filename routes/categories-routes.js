const express = require("express");
const { check } = require("express-validator");

const categoriesControllers = require("../controllers/categories-controllers");

const router = express.Router();

router.get("/", categoriesControllers.getCategories);

router.post(
  "/",
  [check("name").not().isEmpty()],
  categoriesControllers.createCategory
);

module.exports = router;
