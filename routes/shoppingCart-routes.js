const express = require("express");
const { check } = require("express-validator");

const shoppingCartControllers = require("../controllers/shoppingCart-controllers");
const fileUpload = require("../middleware/file-upload");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

router.use(checkAuth);

router.get("/:uid/", shoppingCartControllers.getCartByUserId);

router.post("/:uid/", shoppingCartControllers.addProductToCart);

router.patch("/:uid/", shoppingCartControllers.updateProductInCart);

router.delete("/:uid/summary", shoppingCartControllers.deleteProductsFromCart);

router.delete("/:uid/:pcid", shoppingCartControllers.deleteProductFromCart);

module.exports = router;
