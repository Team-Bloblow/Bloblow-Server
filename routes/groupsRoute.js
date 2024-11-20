const express = require("express");
const router = express.Router();
const groupsController = require("../controllers/groupsController");

router.get("/:uid", groupsController.list);
router.put("/:groupId", groupsController.edit);

module.exports = router;
