const express = require("express");
const router = express.Router();
const keywordController = require("../controllers/keywordController");

router.post("/", keywordController.create);
router.delete("/:keywordId", keywordController.remove);

module.exports = router;
