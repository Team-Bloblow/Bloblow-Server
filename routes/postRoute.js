const express = require("express");
const router = express.Router();
const postController = require("../controllers/postController");

router.get("/keywords/:keywordId/today", postController.today);
router.get("/keywords/:keywordId/postCount", postController.postCount);
router.get("/keywords/:keywordId/postLike", postController.postLike);
router.get("/keywords/:keywordId/postComment", postController.postComment);
router.get("/:keywordId", postController.list);
router.get("/groups/:groupId/postCount", postController.groupPostCount);
router.get("/groups/:groupId/likeCount", postController.groupLikeCount);
router.get("/groups/:groupId/commentCount", postController.groupCommentCount);

module.exports = router;
