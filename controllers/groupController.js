const groupModel = require("../models/groupModel");
const { isValidString, isEmptyString } = require("../utils/validation");

const create = async (req, res) => {
  if (!isValidString(req.body.groupName) || isEmptyString(req.body.groupName)) {
    return res.status(400).send({ message: "[InvalidGroupName] Error occured" });
  }
  if (!isValidString(req.body.ownerUid) || isEmptyString(req.body.ownerUid)) {
    return res.status(400).send({ message: "[InvalidOwnerUid] Error occured" });
  }

  const isDuplicatedGroupName = await groupModel.findOne({
    ownerUid: req.body.ownerUid,
    name: req.body.groupName,
  });
  if (isDuplicatedGroupName) {
    return res.status(400).send({ message: "[ExistedGroupName] Error occured" });
  }

  const { ownerUid, groupName } = req.body;

  try {
    const { _id: groupIdCreated } = await groupModel.create({ ownerUid, name: groupName });
    const groupResult = await groupModel.findById(groupIdCreated);

    return res.status(201).json(groupResult);
  } catch {
    return res
      .status(500)
      .send({ message: "[ServerError] Error occured in 'groupController.create'" });
  }
};

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
    const groupId = req.params.groupId;
    const groupNewName = req.body.groupNewName;
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

module.exports = { create, edit };
