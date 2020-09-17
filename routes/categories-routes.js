const express = require("express");
const { check } = require("express-validator");

const categoriesControllers = require("../controllers/categories-controllers");

const checkAuth = require("../middleware/check-auth");

const router = express.Router();

router.get("/", categoriesControllers.getCategories);

router.use(checkAuth);

router.post(
  "/addcategory",
  [check("name").not().isEmpty()],
  categoriesControllers.createCategory
);

module.exports = router;
