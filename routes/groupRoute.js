const express = require("express");
const router = express.Router();
const groupController = require("../controllers/groupController");

router.post("/", groupController.create);
router.get("/:groupId", groupController.list);
router.put("/:groupId", groupController.edit);

module.exports = router;
