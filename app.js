const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");

const indexRouter = require("./routes/indexRoute");
const keywordRouter = require("./routes/keywordRoute");

const mongoose = require("mongoose");

const app = express();

require("dotenv").config();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/keyword", keywordRouter);

app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  res.status(err.status || 500);
  res.render("error");
});

const username = encodeURIComponent(process.env.DB_USERNAME);
const password = encodeURIComponent(process.env.DB_PASSWORD);

const uri = `mongodb+srv://${username}:${password}@bloblow.naudn.mongodb.net/?retryWrites=true&w=majority&appName=bloblow`;

const clientOptions = {
  serverApi: { version: "1", strict: true, deprecationErrors: true },
  serverSelectionTimeoutMS: 5000,
};

const connectDB = async () => {
  try {
    await mongoose.connect(uri, clientOptions);
  } catch (err) {
    console.error(err);
  }
};
connectDB();

app.listen(3000, () => {
  console.log("🚀Server Run!");
});

module.exports = app;
