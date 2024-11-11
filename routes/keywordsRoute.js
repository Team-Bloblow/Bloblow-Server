const express = require("express");
const router = express.Router();
const keywordsController = require("../controllers/keywordsController");

router.get("/:keywordId", keywordsController.list);
router.put("/:keywordId", keywordsController.put);

module.exports = router;
