const express = require("express");

const categoriesControllers = require("../controllers/categories-controllers");

const router = express.Router();

router.get("/", categoriesControllers.getCategories);

module.exports = router;
