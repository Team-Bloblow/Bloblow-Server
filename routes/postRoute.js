const express = require("express");
const router = express.Router();
const postController = require("../controllers/postController");

router.get("/keywords/:keywordId/today", postController.today);
router.get("/keywords/:keywordId/postCount", postController.postCount);
router.get("/:keywordId", postController.list);
router.get("/groups/:groupId/postCount", postController.groupPostCount);

module.exports = router;
