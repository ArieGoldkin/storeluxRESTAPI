const fs = require("fs");
const path = require("path");

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const productsRoutes = require("./routes/products-routes");
const usersRoutes = require("./routes/users-routes");
const categoriesRoutes = require("./routes/categories-routes");
const HttpError = require("./models/http-errors");

const allowedOrigins = "http://localhost:3000";

const app = express();

app.use(bodyParser.json());

app.use("/uploads/images", express.static(path.join("uploads", "images")));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", allowedOrigins);
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "PATCH, POST, GET, DELETE, OPTION"
  );
  next();
});

app.use("/api/products", productsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/categories", categoriesRoutes);

app.use((req, res, next) => {
  // if route not found throws an error
  const error = new HttpError("Could not find this route.", 404);
  throw error;
});

//rols back if could not add or update with file handler
app.use((error, req, res, next) => {
  if (req.file) {
    fs.unlink(req.file.path, (err) => {
      console.log(err);
    });
  }
  if (res.headerSent) {
    return next(error);
  }
  res.status(error.code || 500);
  res.json({ message: error.message || "An unknown error occurred!" });
});

mongoose
  .connect(
    "mongodb+srv://ArieGold:ArieGold5378581@projectapi-fg6wx.gcp.mongodb.net/storeluxDB?retryWrites=true&w=majority"
  )
  .then(() => {
    app.listen(5000);
  })
  .catch((err) => {
    console.log(err);
  });
