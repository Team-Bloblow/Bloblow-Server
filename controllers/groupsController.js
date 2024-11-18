const groupModel = require("../models/groupModel");
const { isValidString, isEmptyString } = require("../utils/validation");

const list = async (req, res) => {
  if (!isValidString(req.params.uid) || isEmptyString(req.params.uid)) {
    return res.status(400).send({ message: "[InvalidUid] Error occured" });
  }

  try {
    const { uid } = req.params;
    const groupListResult = await groupModel
      .find({ ownerUid: uid })
      .populate("keywordIdList", "keyword")
      .sort({ updatedAt: -1 });
    res.status(200).json({ groupListLength: groupListResult.length, groupListResult });
  } catch {
    return res
      .status(500)
      .send({ message: "[ServerError] Error occured in 'groupsController.list'" });
  }
};

const edit = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { groupNewName } = req.body;
    const groupResult = await groupModel
      .findByIdAndUpdate({ _id: groupId }, { name: groupNewName }, { new: true })
      .exec();
    res.status(200).json({ groupResult });
  } catch {
    return res
      .status(500)
      .send({ message: "[ServerError] Error occured in 'groupsController.edit'" });
  }
};

module.exports = { list, edit };
