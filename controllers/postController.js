const postModel = require("../models/postModel");
const { isValidString, isValidNumber } = require("../utils/validation");

const upsert = async (post) => {
  if (
    !isValidString(post.keywordId) ||
    !isValidString(post.title) ||
    !isValidString(post.content) ||
    !isValidString(post.description) ||
    !isValidString(post.link) ||
    !isValidNumber(post.commentCount) ||
    !isValidNumber(post.likeCount)
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
