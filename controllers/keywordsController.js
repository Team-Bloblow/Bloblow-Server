const { isValidString, isEmptyString, isValidArray } = require("../utils/validation");
const keywordModel = require("../models/keywordModel");
const postModel = require("../models/postModel");

const list = async (req, res) => {
  if (!isValidString(req.params.keywordId) || isEmptyString(req.params.keywordId)) {
    return res.status(400).send({ message: "[InvalidKeywordId] Error occured" });
  }

  try {
    const { keywordId } = req.params;
    const keywordResult = await keywordModel.findById(keywordId).exec();

    const postList = await postModel.find({ keywordId }).exec();
    const postIdList = postList.length === 0 ? [] : postList.map((data) => data._id);

    res.status(200).json({ ...keywordResult.toObject(), postId: postIdList });
  } catch {
    return res
      .status(500)
      .send({ message: "[ServerError] Error occured in 'keywordController.list'" });
  }
};

const put = async (req, res) => {
  if (!isValidString(req.params.keywordId) || isEmptyString(req.params.keywordId)) {
    return res.status(400).send({ message: "[InvalidKeywordId] Error occured" });
  }

  if (
    !isValidArray(req.body.includedKeyword) ||
    !req.body.includedKeyword.every((el) => isValidString(el))
  ) {
    return res.status(400).send({ message: "[InvalidIncludedKeyword] Error occured" });
  }

  if (
    !isValidArray(req.body.excludedKeyword) ||
    !req.body.excludedKeyword.every((el) => isValidString(el))
  ) {
    return res.status(400).send({ message: "[InvalidExcludedKeyword] Error occured" });
  }

  if (!isValidString(req.body.ownerUid) || isEmptyString(req.body.ownerUid)) {
    return res.status(400).send({ message: "[InvalidOwnerUid] Error occured" });
  }

  try {
    const { keywordId } = req.params;
    const { includedKeyword, excludedKeyword } = req.body;
    const keywordResult = await keywordModel
      .findByIdAndUpdate(keywordId, { $set: { includedKeyword, excludedKeyword } }, { new: true })
      .exec();
    let postIdListHadExcludedKeyword = [];
    excludedKeyword.forEach(async (keyword) => {
      const postList = await postModel.find({ keywordId }).find({ content: { $regex: keyword } });
      const postIdList = postList.map((post) => post._id.toString());
      postIdListHadExcludedKeyword.push(...postIdList);
    });

    const postListResult = await postModel.find({ keywordId }).exec();
    const postIdListResult = postListResult
      .filter((el) => {
        return !postIdListHadExcludedKeyword.includes(el._id.toString());
      })
      .map((el) => el._id);
    res.status(200).json({ ...keywordResult.toObject(), postId: postIdListResult });
  } catch {
    res.status(500).send({ message: "[ServerError] Error occured in 'keywordsController.put'" });
  }
};

module.exports = { list, put };
