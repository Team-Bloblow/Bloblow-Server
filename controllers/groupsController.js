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
  } catch {
    return res
      .status(500)
      .send({ message: "[ServerError] Error occured in 'groupsController.summary'" });
  }
};

module.exports = { list, summary };
