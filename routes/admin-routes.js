const express = require("express");
const { check } = require("express-validator");

const adminControllers = require("../controllers/admin-controllers");
// const fileUpload = require("../middleware/file-upload");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

router.use(checkAuth);

router.get("/globaldata", adminControllers.getGlobalData);

router.patch(
  "/updaterate",
  check("vatRate").not().isEmpty(),
  adminControllers.updateRate
);

router.delete("/deleteitems", adminControllers.deleteProducts);

module.exports = router;
