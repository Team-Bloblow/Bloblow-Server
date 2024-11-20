const groupModel = require("../models/groupModel");
const { isValidString, isEmptyString } = require("../utils/validation");

const edit = async (req, res) => {
  if (!isValidString(req.params.groupId) || isEmptyString(req.params.groupId)) {
    return res.status(400).send({ message: "[InvalidGroupId] Error occured" });
  }
  if (!isValidString(req.body.groupOwnerUid) || isEmptyString(req.body.groupOwnerUid)) {
    return res.status(400).send({ message: "[InvalidGroupOwnerUid] Error occured" });
  }
  if (!isValidString(req.body.groupNewName) || isEmptyString(req.body.groupNewName)) {
    return res.status(400).send({ message: "[InvalidGroupNewName] Error occured" });
  }

  const hasGroupName =
    (await groupModel.findOne({
      ownerUid: req.body.groupOwnerUid,
      name: req.body.groupNewName,
    })) !== null;
  if (hasGroupName) {
    return res.status(400).send({ message: "[ExistedGroupName] Error occured" });
  }

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
      .send({ message: "[ServerError] Error occured in 'groupController.edit'" });
  }
};

module.exports = { edit };
