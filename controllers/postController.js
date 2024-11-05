const postModel = require("../models/postModel");
const { isValidatedString, isValidatedNumber } = require("../utils/validation");

const upsert = async (post) => {
  if (
    !isValidatedString(post.keywordId) ||
    !isValidatedString(post.title) ||
    !isValidatedString(post.content) ||
    !isValidatedString(post.description) ||
    !isValidatedString(post.link) ||
    !isValidatedNumber(post.commentCount) ||
    !isValidatedNumber(post.likeCount)
  ) {
    return;
  }

  await postModel.findOneAndUpdate(
    { link: post.link },
    {
      keywordId: post.keywordId,
      title: post.title,
      description: post.description,
      content: post.content,
      commentCount: post.commentCount,
      likeCount: post.likeCount,
    },
    { upsert: true }
  );
};

module.exports = { upsert };
