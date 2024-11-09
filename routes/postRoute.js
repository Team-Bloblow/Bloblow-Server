const express = require("express");
const router = express.Router();
const postController = require("../controllers/postController");

router.get("/:keywordId", postController.list);

module.exports = router;
