const express = require("express");
const router = express.Router();
const keywordController = require("../controllers/keywordController");

router.post("/", keywordController.create);
router.get("/:keywordId", keywordController.list);

module.exports = router;
