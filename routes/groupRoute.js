const express = require("express");
const router = express.Router();
const groupController = require("../controllers/groupController");

router.post("/", groupController.create);
router.put("/:groupId", groupController.edit);

module.exports = router;
