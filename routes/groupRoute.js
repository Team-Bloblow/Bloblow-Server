const express = require("express");
const router = express.Router();
const groupController = require("../controllers/groupController");

router.post("/group", groupController.create);

module.exports = router;
