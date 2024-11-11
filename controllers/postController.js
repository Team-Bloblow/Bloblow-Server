const postModel = require("../models/postModel");
const keywordModel = require("../models/keywordModel");
const { isValidString, isValidNumber, isEmptyString } = require("../utils/validation");

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

const list = async (req, res) => {
  if (!isValidString(req.params.keywordId) || isEmptyString(req.params.keywordId)) {
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

  const hasKeywordId = (await keywordModel.findOne({ _id: req.params.keywordId })) !== null;
  if (!hasKeywordId) {
    return res.status(400).send({ message: "[NotExistedKeywordId] Error occured" });
  }

  if (!isEmptyString(req.query.cursorId)) {
    const hasCursorId = (await postModel.findOne({ _id: req.query.cursorId })) !== null;
    if (!hasCursorId) {
      return res.status(400).send({ message: "[NotExistedCursorId] Error occured" });
    }
  }

  const keywordId = req.params.keywordId;
  const { includedKeyword, cursorId } = req.query;
  const limit = Number(req.query.limit);
  let hasNext = false;
  let postListResult;

  try {
    if (isEmptyString(cursorId)) {
      postListResult = await postModel
        .find({ keywordId })
        .find({ content: { $regex: includedKeyword } })
        .sort({ _id: -1 })
        .limit(limit);
    } else {
      postListResult = await postModel
        .find({ keywordId })
        .find({ content: { $regex: includedKeyword } })
        .find({ _id: { $lt: cursorId } })
        .sort({ _id: -1 })
        .limit(limit);
    }

    const nextCursorId = postListResult[postListResult.length - 1]?._id;
    const nextPostResult = await postModel
      .find({ keywordId: keywordId })
      .find({ content: { $regex: includedKeyword } })
      .findOne({ _id: { $lt: nextCursorId } });

    if (nextPostResult !== null) {
      hasNext = true;
    }

    return res.status(200).json({
      items: postListResult,
      nextCursorId,
      hasNext,
    });
  } catch (error) {
    return res
      .status(500)
      .send({ message: "[ServerError] Error occured in 'postController.list'" });
  }
};

const today = async (req, res) => {
  if (!isValidString(req.params.keywordId) || isEmptyString(req.params.keywordId)) {
    return res.status(400).send({ message: "[InvalidKeywordId] Error occured" });
  }

  const hasKeywordId = (await keywordModel.findOne({ _id: req.params.keywordId }).exec()) !== null;
  if (!hasKeywordId) {
    return res.status(400).send({ message: "[NotExistedKeywordId] Error occured" });
  }

  const keywordId = req.params.keywordId;

  try {
    const today = new Date();
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);

    const todayPostCount = await postModel
      .find({ keywordId })
      .find({
        createdAt: {
          $gte: today.setHours(0, 0, 0, 0),
          $lt: today.setHours(23, 59, 59, 999),
        },
      })
      .countDocuments()
      .exec();

    const yesterdayPostCount = await postModel
      .find({ keywordId })
      .find({
        createdAt: {
          $gte: yesterday.setHours(0, 0, 0, 0),
          $lt: yesterday.setHours(23, 59, 59, 999),
        },
      })
      .countDocuments()
      .exec();

    const diffPostCount = todayPostCount - yesterdayPostCount;
    const diffPercent =
      Math.min(todayPostCount, yesterdayPostCount) > 0
        ? Math.abs(diffPostCount) / todayPostCount
        : 0;

    return res.status(200).json({
      todayPostCount,
      diffPostCount,
      diffPercent,
    });
  } catch {
    return res
      .status(500)
      .send({ message: "[ServerError] Error occured in 'postController.today'" });
  }
};

module.exports = { upsert, list, today };
