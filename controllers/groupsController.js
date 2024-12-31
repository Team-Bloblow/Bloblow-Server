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
    const { uid } = req.params;

    const keywordResult = await keywordModel.find({ ownerUid: uid }).sort({ updatedAt: -1 }).exec();
    const keywordList = keywordResult.map((keyword) => {
      return {
        id: keyword._id.toString(),
        name: keyword.keyword,
      };
    });

    const keywordIdList = keywordResult.map((keyword) => keyword._id.toString());
    let keywordIdNewestHavingPost;

    for await (const keywordId of keywordIdList) {
      const hasPost = (await postModel.find({ keywordId }).countDocuments().exec()) > 0;

      if (hasPost) {
        keywordIdNewestHavingPost = keywordId;
        break;
      }
    }
    const keywordUpdatedNewestHavingPost = keywordResult.filter(
      (keyword) => keywordIdNewestHavingPost === keyword._id.toString()
    )[0];

    const lastUpdatedAt = keywordUpdatedNewestHavingPost.updatedAt;
    const dateNewest = lastUpdatedAt.toString();
    const dateNewestStart = new Date(dateNewest).setHours(0, 0, 0, 0);
    const dateNewestEnd = new Date(dateNewest).setHours(23, 59, 59, 999);

    const groupUpdatedNewest = (
      await groupModel.find({ keywordIdList: { _id: keywordUpdatedNewestHavingPost._id } })
    )[0];

    const keywordListOfNewestGroup = groupUpdatedNewest.keywordIdList.map((keyword) =>
      keyword.toString()
    );

    const postCountByKeyword = await postModel.aggregate([
      {
        $match: {
          updatedAt: { $gte: new Date(dateNewestStart), $lte: new Date(dateNewestEnd) },
          keywordId: { $in: keywordListOfNewestGroup },
        },
      },
      {
        $group: {
          _id: "$keywordId",
          postCount: { $sum: 1 },
        },
      },
    ]);

    const postUpdateNewest = [...postCountByKeyword];
    postUpdateNewest.forEach((update) => {
      return keywordList.forEach((keyword) => {
        if (update._id === keyword.id) {
          return (update.name = keyword.name);
        }
      });
    });

    res.status(200).json({
      group: groupUpdatedNewest.name,
      postUpdateNewest,
      lastUpdatedAt,
    });
  } catch {
    return res
      .status(500)
      .send({ message: "[ServerError] Error occured in 'groupsController.summary'" });
  }
};

module.exports = { list, summary };
