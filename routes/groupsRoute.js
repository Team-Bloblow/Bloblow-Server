const express = require("express");
const router = express.Router();
const groupsController = require("../controllers/groupsController");

router.get("/:uid", groupsController.list);

module.exports = router;
