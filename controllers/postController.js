const postModel = require("../models/postModel");
const keywordModel = require("../models/keywordModel");
const { isValidString, isValidNumber, isBlank } = require("../utils/validation");

const upsert = async (req) => {
  if (
    !isValidString(req.title) ||
    !isValidString(req.link) ||
    !isValidString(req.description) ||
    !isValidString(req.content) ||
    !isValidNumber(req.commentCount) ||
    !isValidNumber(req.likeCount)
  ) {
    return;
  }

  await postModel.findOneAndUpdate(
    {
      keywordId: req.keywordId,
      link: req.link,
    },
    {
      title: req.title,
      description: req.description,
      content: req.content,
      commentCount: req.commentCount,
      likeCount: req.likeCount,
    },
    { upsert: true }
  );
};

const find = async (req, res) => {
  if (!isValidString(req.params.keywordId) || isBlank(req.params.keywordId)) {
    return res.status(400).send({ message: "[InvalidKeywordId] Error occured" });
  }
  if (!isValidString(req.query.includedKeyword)) {
    return res.status(400).send({ message: "[InvalidIncludedKeyword] Error occured" });
  }
  if (!isValidNumber(Number(req.query.limit)) || Number(req.query.limit) <= 0) {
    return res.status(400).send({ message: "[InvalidLimit] Error occured" });
  }
  if (!isValidString(req.query.cursorId)) {
    return res.status(400).send({ message: "[InvalidCursorId] Error occured" });
  }

  const isNotExistKeywordId = (await keywordModel.findOne({ _id: req.params.keywordId })) === null;
  if (isNotExistKeywordId) {
    return res.status(400).send({ message: "[InvalidKeywordId] Error occured" });
  }

  const keywordId = req.params.keywordId;
  const includedKeyword = req.query.includedKeyword;
  const limit = Number(req.query.limit);
  const cursorId = req.query.cursorId;

  let postList;
  if (isBlank(cursorId)) {
    postList = await postModel
      .find({ keywordId: keywordId })
      .find({ content: { $regex: `.*${includedKeyword}.*` } })
      .sort({ _id: -1 })
      .limit(limit);
  } else {
    postList = await postModel
      .find({ keywordId: keywordId })
      .find({ content: { $regex: `.*${includedKeyword}.*` } })
      .find({ _id: { $lt: cursorId } })
      .sort({ _id: -1 })
      .limit(limit);
  }

  return res.status(200).json(postList);
};

module.exports = { upsert, find };
