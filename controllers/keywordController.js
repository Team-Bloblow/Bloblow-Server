const keywordModel = require("../models/keywordModel");
const groupModel = require("../models/groupModel");
const { isValidString, isBlank } = require("../utils/validation");
const { getKeywordPostList } = require("../services/crawling");

const create = async (req, res) => {
  if (!isValidString(req.body.groupId)) {
    return res.status(400).send({ message: "[InvalidGroupId] Error occured" });
  }
  if (!isValidString(req.body.ownerId)) {
    return res.status(400).send({ message: "[InvalidOwnerId] Error occured" });
  }
  if (!isValidString(req.body.keyword)) {
    return res.status(400).send({ message: "[InvalidKeyword] Error occured" });
  }

  if (!isBlank(req.body.groupId)) {
    const isNotExistedGroupId = (await groupModel.find({ _id: req.body.groupId })).length === 0;
    if (isNotExistedGroupId) {
      return res.status(400).send({ message: "[NotExistedGroupId] Error occured" });
    }
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
    let groupResult;

    if (isBlank(groupId)) {
      groupResult = await groupModel.create({
        name: groupName,
        ownerId,
        keywordIdList: [keywordIdCreated],
      });
    } else {
      groupResult = await groupModel.findByIdAndUpdate(
        { _id: groupId },
        { $push: { keywordIdList: keywordIdCreated } },
        { new: true }
      );
    }

    await getKeywordPostList(keyword, keywordIdCreated);

    return res.status(201).json(groupResult);
  } catch (error) {
    return res
      .status(500)
      .send({ message: "[ServerError] Error occured in 'keywordController.create'" });
  }
};

module.exports = { create };
