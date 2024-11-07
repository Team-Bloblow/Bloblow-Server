const postModel = require("../models/postModel");
const { isValidString, isValidNumber } = require("../utils/validation");

const upsert = async (post) => {
  if (
    !isValidString(post.title) ||
    !isValidString(post.link) ||
    !isValidString(post.description) ||
    !isValidString(post.content) ||
    !isValidNumber(post.commentCount) ||
    !isValidNumber(post.likeCount)
  ) {
    return;
  }

  await postModel.findOneAndUpdate(
    {
      keywordId: post.keywordId,
      link: post.link,
    },
    {
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
