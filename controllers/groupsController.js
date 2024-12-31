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
    const uid = req.params.uid;

    let lastUpdatedGroup = { name: null };
    let lastUpdatedPost = [];
    let lastUpdatedAt = null;

    const userKeywordList = await keywordModel
      .find({ ownerUid: uid }, { keyword: 1, updatedAt: 1 })
      .sort({ updatedAt: -1 })
      .exec();

    if (userKeywordList.length > 0) {
      for await (const keyword of userKeywordList) {
        const hasPost =
          (await postModel.find({ keywordId: keyword._id.toString() }).countDocuments().exec()) > 0;

        if (hasPost) {
          lastUpdatedkeyword = keyword;
          break;
        }
      }

      lastUpdatedAt = lastUpdatedkeyword.updatedAt;

      const lastUpdatedAtStart = new Date(lastUpdatedAt).setHours(0, 0, 0, 0);
      const lastUpdatedAtEnd = new Date(lastUpdatedAt).setHours(23, 59, 59, 999);

      lastUpdatedGroup = await groupModel.findOne({
        keywordIdList: lastUpdatedkeyword._id,
      });
      const lastUpdatedGroupKeywordList = lastUpdatedGroup.keywordIdList.map((keyword) =>
        keyword.toString()
      );

      const postCountByKeyword = await postModel.aggregate([
        {
          $match: {
            updatedAt: { $gte: new Date(lastUpdatedAtStart), $lte: new Date(lastUpdatedAtEnd) },
            keywordId: { $in: lastUpdatedGroupKeywordList },
          },
        },
        {
          $group: {
            _id: "$keywordId",
            postCount: { $sum: 1 },
          },
        },
      ]);

      const keywordIdListResult = postCountByKeyword.map((result) => result._id);

      if (lastUpdatedGroupKeywordList.length !== keywordIdListResult.length) {
        lastUpdatedGroupKeywordList.forEach((el) => {
          if (!keywordIdListResult.includes(el)) {
            postCountByKeyword.push({
              _id: el,
              postCount: 0,
            });
          }
        });
      }

      lastUpdatedPost = [...postCountByKeyword];
      lastUpdatedPost.forEach((update) => {
        userKeywordList.forEach((keyword) => {
          if (update._id === keyword.id.toString()) {
            update.name = keyword.keyword;
          }
        });
      });
    }

    res.status(200).json({
      group: lastUpdatedGroup.name,
      postUpdateNewest: lastUpdatedPost,
      lastUpdatedAt,
    });
  } catch {
    return res
      .status(500)
      .send({ message: "[ServerError] Error occured in 'groupsController.summary'" });
  }
};

module.exports = { list, summary };
