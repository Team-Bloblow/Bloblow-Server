const express = require("express");
const router = express.Router();
const postController = require("../controllers/postController");

router.get("/:keywordId/today", postController.today);
router.get("/:keywordId", postController.list);

module.exports = router;
