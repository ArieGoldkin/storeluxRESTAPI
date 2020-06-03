const express = require("express");
const { check } = require("express-validator");

const usersColntoller = require("../controllers/users-controllers");

const router = express.Router();

router.get("/", usersColntoller.getUsers);

router.post(
  "/signup",
  [
    check("firstName").not().isEmpty(),
    check("lastName").not().isEmpty(),
    check("email").normalizeEmail().isEmail(), //normalizeEmail checking if it is an email
    check("password").isLength({ min: 6 }),
  ],
  usersColntoller.signup
);

router.post("/login", usersColntoller.login);

module.exports = router;
