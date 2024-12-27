const keywordModel = require("../models/keywordModel");
const groupModel = require("../models/groupModel");
const postModel = require("../models/postModel");
const { isValidString, isEmptyString } = require("../utils/validation");

const create = async (req, res) => {
  if (!isValidString(req.body.groupId) || isEmptyString(req.body.groupId)) {
    return res.status(400).send({ message: "[InvalidGroupId] Error occured" });
  }
  if (!isValidString(req.body.ownerUid) || isEmptyString(req.body.ownerUid)) {
    return res.status(400).send({ message: "[InvalidOwnerUid] Error occured" });
  }
  if (!isValidString(req.body.keyword) || isEmptyString(req.body.keyword)) {
    return res.status(400).send({ message: "[InvalidKeyword] Error occured" });
  }

  const isNotExistedGroupId = (await groupModel.findOne({ _id: req.body.groupId })) === null;
  if (isNotExistedGroupId) {
    return res.status(400).send({ message: "[NotExistedGroupId] Error occured" });
  }

  const isDuplicatedKeyword = await groupModel
    .findOne({ _id: req.body.groupId })
    .populate("keywordIdList", "keyword")
    .exec()
    .then((query) => {
      return query.keywordIdList.some((doc) => doc.keyword === req.body.keyword);
    })
    .catch(() => {
      return res.status(400).send({ message: "[InvalidGroupId] Error occured" });
    });

  if (isDuplicatedKeyword) {
    return res.status(400).send({ message: "[ExistedKeyword] Error occured" });
  }

  const { groupId, ownerUid, keyword } = req.body;

  try {
    const keywordResult = await keywordModel.create({ keyword, ownerUid });
    const { _id: keywordIdCreated } = keywordResult;

    const groupResult = await groupModel.findByIdAndUpdate(
      { _id: groupId },
      { $push: { keywordIdList: keywordIdCreated } },
      { new: true }
    );

    return res.status(201).json(groupResult);
  } catch {
    return res
      .status(500)
      .send({ message: "[ServerError] Error occured in 'keywordController.create'" });
  }
};

const remove = async (req, res) => {
  if (!isValidString(req.params.keywordId) || isEmptyString(req.params.keywordId)) {
    return res.status(400).send({ message: "[InvalidKeywordId] Error occured" });
  }

  const keywordInfo = await keywordModel.findById(req.params.keywordId).exec();
  if (keywordInfo === null) {
    return res.status(400).send({ message: "[NotExistedKeywordId] Error occured" });
  }

  const keywordId = req.params.keywordId;
  const { _id: groupId } = await groupModel.findOne({ keywordIdList: { $in: keywordId } }).exec();

  try {
    await postModel.deleteMany({ keywordId }).exec();
    await groupModel
      .updateOne({ _id: groupId }, { $pullAll: { keywordIdList: [keywordInfo._id] } })
      .exec();
    await keywordModel.deleteOne({ _id: keywordInfo._id }).exec();

    return res.status(200).json({ status: "ok" });
  } catch {
    return res
      .status(500)
      .send({ message: "[ServerError] Error occured in 'keywordController.remove'" });
  }
};

module.exports = { create, remove };
