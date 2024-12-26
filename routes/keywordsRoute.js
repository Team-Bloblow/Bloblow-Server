const express = require("express");
const router = express.Router();
const keywordsController = require("../controllers/keywordsController");

router.get("/:keywordId", keywordsController.list);
router.post("/:keywordId", keywordsController.update);

module.exports = router;
