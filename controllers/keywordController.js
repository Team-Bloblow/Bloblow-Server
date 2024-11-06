const keywordModel = require("../models/keywordModel");
const groupModel = require("../models/groupModel");

const isValid = (data) => {
  return data !== null && data !== undefined;
};

const create = async (req, res) => {
  if (!isValid(req.body.groupName) || !isValid(req.body.keyword) || !isValid(req.body.ownerId)) {
    res.status(400).send({ message: "[Error: keywordCreate] Content can not be empty!" });
  }

  const isDuplicatedKeyword =
    keywordModel.find({ groupId: req.body.groupId, keyword: req.body.keyword }) === null;

  if (isDuplicatedKeyword) {
    res.status(400).send({ message: "[Error: keywordCreate] Content can not be duplicated!" });
  }

  const { groupId, groupName, keyword, ownerId } = req.body;

  try {
    if (groupId === null) {
      const resultGroupCreated = await groupModel.create({
        name: groupName,
        ownerId,
        keywordList: [keyword],
      });
      await keywordModel.create({
        keyword,
        ownerId: ownerId,
      });
      res.status(201).json(resultGroupCreated);
    } else {
      await keywordModel.create({ keyword, ownerId });
      const queryGroupUpdated = await groupModel.findByIdAndUpdate(
        groupId,
        { $push: { keywordList: keyword } },
        { new: true }
      );
      res.status(201).json(queryGroupUpdated);
    }
  } catch (error) {
    console.error("[Error: groupCreate] ", error);
    res.status(500).send(error);
  }
};

module.exports = { create };
