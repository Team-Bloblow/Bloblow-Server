const groupModel = require("../models/groupModel");
const keywordModel = require("../models/keywordModel");
const postModel = require("../models/postModel");
const { isValidString, isEmptyString } = require("../utils/validation");

const list = async (req, res) => {
  if (!isValidString(req.params.uid) || isEmptyString(req.params.uid)) {
    return res.status(400).send({ message: "[InvalidUid] Error occured" });
  }

  try {
    const { uid } = req.params;
    const groupListResult = await groupModel
      .find({ ownerUid: uid })
      .populate("keywordIdList", "keyword")
      .sort({ updatedAt: -1 });
    res.status(200).json({ groupListLength: groupListResult.length, groupListResult });
  } catch {
    return res
      .status(500)
      .send({ message: "[ServerError] Error occured in 'groupsController.list'" });
  }
};

const summary = async (req, res) => {
  if (!isValidString(req.params.uid) || isEmptyString(req.params.uid)) {
    return res.status(400).send({ message: "[InvalidUid] Error occured" });
  }

  try {
    const postUpdateNewest = [];
    const { uid } = req.params;
    const keywordListResult = await keywordModel.find({ ownerUid: uid }).exec();
    const keywordIdList = keywordListResult.map((keyword) => keyword._id);
    const postCreatedLast = [];

    for await (const id of keywordIdList) {
      const postResult = await postModel.find({ keywordId: id }).sort({ createdAt: -1 }).exec();
      postCreatedLast.push({
        keywordId: postResult[0].keywordId,
        createdAt: postResult[0].createdAt,
      });
    }

    const postCreatedNewest = postCreatedLast?.reduce((prev, curr) => {
      return new Date(prev.createdAt) <= new Date(curr.createdAt) ? curr : prev;
    });
    const dateNewest = postCreatedNewest.createdAt.toString();
    const dateNewestStart = new Date(dateNewest).setHours(0, 0, 0, 0);
    const dateNewestEnd = new Date(dateNewest).setHours(23, 59, 59, 999);
    const groupListResult = await groupModel
      .find({ ownerUid: uid })
      .populate("keywordIdList", "keyword")
      .exec();
    const groupUpdatedNewest = groupListResult.filter((group) => {
      return group.keywordIdList.some(
        (keyword) => keyword._id.toString() === postCreatedNewest.keywordId.toString()
      );
    })[0];
    const keywordList = groupUpdatedNewest.keywordIdList;

    for await (const keyword of keywordList) {
      const post = await postModel
        .find({
          keywordId: keyword._id,
          createdAt: { $gte: dateNewestStart, $lte: dateNewestEnd },
        })
        .exec();

      postUpdateNewest.push({ name: keyword.keyword, count: post.length });
    }

    res.status(200).json({
      group: groupUpdatedNewest.name,
      postUpdateNewest,
      lastUpdatedAt: postCreatedNewest.createdAt,
    });
  } catch {
    return res
      .status(500)
      .send({ message: "[ServerError] Error occured in 'groupsController.summary'" });
  }
};

module.exports = { list, summary };
