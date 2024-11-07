const keywordModel = require("../models/keywordModel");
const groupModel = require("../models/groupModel");

const isValid = (data) => {
  return data !== null && data !== undefined;
};

const create = async (req, res) => {
  if (!isValid(req.body.groupName) || !isValid(req.body.keyword) || !isValid(req.body.ownerId)) {
    res.status(400).send({ message: "[Error] Empty content in '/keywordCreate'" });
  }

  const isDuplicatedKeyword =
    keywordModel.find({ groupId: req.body.groupId, keyword: req.body.keyword }) === null;

  if (isDuplicatedKeyword) {
    res.status(400).send({ message: "[Error] Duplicated content in '/keywordCreate'" });
  }

  const isValidGroupId = groupModel.find({ groupId: req.body.groupId }) !== null;

  const { groupId, groupName, keyword, ownerId } = req.body;

  try {
    const resultKeywordCreated = await keywordModel.create({ keyword, ownerId });
    const { _id: keywordIdCreated } = resultKeywordCreated;

    if (groupId === null) {
      const resultGroupCreated = await groupModel.create({
        name: groupName,
        ownerId,
        keywordIdList: [keywordIdCreated],
      });
      res.status(201).json(resultGroupCreated);
    } else if (isValidGroupId) {
      const queryGroupUpdated = await groupModel.findByIdAndUpdate(
        { _id: groupId },
        { $push: { keywordIdList: keywordIdCreated } },
        { new: true }
      );
      res.status(201).json(queryGroupUpdated);
    }
  } catch (error) {
    res.status(500).send({ message: "[Server Error] Error occured in '/keywordCreate'" });
  }
};

module.exports = { create };
