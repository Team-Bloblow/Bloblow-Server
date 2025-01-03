const { isValidString, isEmptyString } = require("../utils/validation");
const keywordModel = require("../models/keywordModel");
const { getKeywordPostList } = require("../services/crawling");

const list = async (req, res) => {
  if (!isValidString(req.params.keywordId) || isEmptyString(req.params.keywordId)) {
    return res.status(400).send({ message: "[InvalidKeywordId] Error occured" });
  }

  try {
    const { keywordId } = req.params;
    const keywordResult = await keywordModel.findById(keywordId).exec();

    res.status(200).json({ ...keywordResult.toObject() });
  } catch {
    return res
      .status(500)
      .send({ message: "[ServerError] Error occured in 'keywordController.list'" });
  }
};

const update = async (req, res) => {
  if (!isValidString(req.params.keywordId) || isEmptyString(req.params.keywordId)) {
    return res.status(400).send({ message: "[InvalidKeywordId] Error occured" });
  }

  const keywordInfo = await keywordModel.findById(req.params.keywordId).exec();
  if (keywordInfo === null) {
    return res.status(400).send({ message: "[NotExistedKeywordId] Error occured" });
  }

  if (keywordInfo.lastCrawledAt !== undefined) {
    const now = new Date();
    const TIME_LIMIT = 60 * 60 * 1000;
    const isCrawlingAllowed = now - keywordInfo.lastCrawledAt > TIME_LIMIT;

    if (!isCrawlingAllowed) {
      return res.status(400).send({ message: "[DuplicatedCrawlingRequest] Error occured" });
    }
  }

  const keywordId = req.params.keywordId;

  try {
    await getKeywordPostList(keywordInfo.keyword, keywordId);
    await keywordModel.updateOne(
      { _id: keywordId },
      { $set: { lastCrawledAt: new Date() } },
      { timestamps: false }
    );
    return res.status(200).json({ status: "ok" });
  } catch {
    return res
      .status(500)
      .send({ message: "[ServerError] Error occured in 'keywordsController.update'" });
  }
};

module.exports = { list, update };
