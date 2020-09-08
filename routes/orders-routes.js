const express = require("express");
// const { check } = require("express-validator");

const ordersControllers = require("../controllers/orders-controllers");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

router.use(checkAuth);

router.get("/:uid", ordersControllers.getOrdersByUserId);

router.post("/:uid/neworder", ordersControllers.addNewOrder);

module.exports = router;
