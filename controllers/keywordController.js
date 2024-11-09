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
    const isNotExistedGroupId = (await groupModel.findOne({ _id: req.body.groupId })) === null;
    if (isNotExistedGroupId) {
      return res.status(400).send({ message: "[NotExistedGroupId] Error occured" });
    }
  }

  const isDuplicatedKeyword =
    (await keywordModel.findOne({ groupId: req.body.groupId, keywordList: req.body.keyword })) ===
    null;

  if (isDuplicatedKeyword) {
    return res.status(400).send({ message: "[ExistedKeyword] Error occured" });
  }

  const { groupName, keyword, ownerId } = req.body;
  let groupId = req.body.groupId;

  try {
    const keywordCreated = await keywordModel.create({ keyword, ownerId });
    const { _id: keywordIdCreated } = keywordCreated;

    if (isBlank(groupId)) {
      const { _id } = await groupModel.create({
        name: groupName,
        ownerId,
        keywordIdList: [keywordIdCreated],
      });

      groupId = _id;
    } else {
      await groupModel.findByIdAndUpdate(
        { _id: groupId },
        { $push: { keywordIdList: keywordIdCreated } }
      );
    }

    await getKeywordPostList(keyword, keywordIdCreated);

    const groupResult = await groupModel
      .findOne({ _id: groupId })
      .populate("keywordIdList", "keyword");
    return res.status(201).json(groupResult);
  } catch (error) {
    return res
      .status(500)
      .send({ message: "[ServerError] Error occured in 'keywordController.create'" });
  }
};

module.exports = { create };
