const keywordModel = require("../models/keywordModel");
const groupModel = require("../models/groupModel");

const isValid = (data) => {
  return data !== null && data !== undefined;
};

const create = async (req, res) => {
  if (!isValid(req.body.groupId)) {
    return res.status(400).send({ message: "[InvalidGroupId] Error occured" });
  }
  if (!isValid(req.body.ownerId)) {
    return res.status(400).send({ message: "[InvalidOwnerId] Error occured" });
  }
  if (!isValid(req.body.keyword)) {
    return res.status(400).send({ message: "[InvalidKeyword] Error occured" });
  }

  const isNotExistedGroupId = (await groupModel.find({ _id: req.body.groupId })).length === 0;
  if (isNotExistedGroupId) {
    return res.status(400).send({ message: "[NotExistedGroupId] Error occured" });
  }

  const isDuplicatedKeyword =
    (await keywordModel.find({ groupId: req.body.groupId, keywordList: req.body.keyword }))
      .length !== 0;
  if (isDuplicatedKeyword) {
    return res.status(400).send({ message: "[ExistedKeyword] Error occured" });
  }

  const { groupId, groupName, keyword, ownerId } = req.body;

  try {
    const keywordCreated = await keywordModel.create({ keyword, ownerId });
    const { _id: keywordIdCreated } = keywordCreated;

    if (groupId === "") {
      const groupCreated = await groupModel.create({
        name: groupName,
        ownerId,
        keywordIdList: [keywordIdCreated],
      });
      return res.status(201).json(groupCreated);
    } else if (!isNotExistedGroupId) {
      const groupUpdated = await groupModel.findByIdAndUpdate(
        { _id: groupId },
        { $push: { keywordIdList: keywordIdCreated } },
        { new: true }
      );
      return res.status(201).json(groupUpdated);
    }
  } catch (error) {
    return res
      .status(500)
      .send({ message: "[ServerError] Error occured in 'keywordController.create'" });
  }
};

module.exports = { create };