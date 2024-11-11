const { isValidString, isEmptyString } = require("../utils/validation");
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

module.exports = { list };
