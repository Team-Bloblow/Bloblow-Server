const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");

const indexRouter = require("./routes/indexRoute");
const userRouter = require("./routes/userRoute");
const groupsRouter = require("./routes/groupsRoute");
const keywordRouter = require("./routes/keywordRoute");
const postRouter = require("./routes/postRoute");

const mongoose = require("mongoose");

const app = express();

require("dotenv").config();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

const CLIENT_SERVER_URL = process.env.CLIENT_SERVER_URL;

app.use(
  cors({
    origin: CLIENT_SERVER_URL,
    credentials: true,
  })
);
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/user", userRouter);
app.use("/groups", groupsRouter);
app.use("/keyword", keywordRouter);
app.use("/posts", postRouter);

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

module.exports = app;
