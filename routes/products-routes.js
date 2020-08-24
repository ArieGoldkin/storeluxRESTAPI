const express = require("express");
const { check } = require("express-validator");

const productsControllers = require("../controllers/products-controllers");
const fileUpload = require("../middleware/file-upload");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

router.get("/", productsControllers.getProducts);

router.get("/:pid", productsControllers.getProductById);

router.get("/user/:uid", productsControllers.getProductsByUserId);

router.use(checkAuth);

router.get("/:uid/shoppingcart", productsControllers.getCartByUserId);

router.post("/:uid/shoppingcart", productsControllers.addProductToCart);

router.patch("/:uid/shoppingcart", productsControllers.updateProductInCart);

router.post(
  "/",
  fileUpload.single("image"),
  [
    check("title").not().isEmpty(),
    check("category").not().isEmpty(),
    check("price").not().isEmpty(),
    check("units").not().isEmpty(),
    check("description").isLength({ min: 5 }),
  ],
  productsControllers.createProduct
);

router.patch(
  "/:pid",
  fileUpload.single("image"),
  [
    check("title").not().isEmpty(),
    check("category").not().isEmpty(),
    check("price").not().isEmpty(),
    check("units").not().isEmpty(),
    check("description").isLength({ min: 5 }),
  ],
  productsControllers.updateProduct
);

router.delete("/:uid/shoppingcart/:pcid", productsControllers.deleteProductFromCart);

router.delete("/:pid", productsControllers.deleteProduct);

module.exports = router;
