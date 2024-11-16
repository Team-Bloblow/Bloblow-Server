const postModel = require("../models/postModel");
const keywordModel = require("../models/keywordModel");
const {
  isValidString,
  isValidNumber,
  isEmptyString,
  isValidBoolean,
} = require("../utils/validation");
const { getCursorWeek, getTargetDateString } = require("../utils/date");
const { DAY_OF_WEEK } = require("../config/constants");
const groupModel = require("../models/groupModel");

const upsert = async (req) => {
  if (
    !isValidString(req.title) ||
    !isValidString(req.link) ||
    !isValidString(req.description) ||
    !isValidString(req.content) ||
    !isValidNumber(req.commentCount) ||
    !isValidNumber(req.likeCount) ||
    !isValidBoolean(req.isAd)
  ) {
    return;
  }

  await postModel.findOneAndUpdate(
    {
      keywordId: req.keywordId,
      link: req.link,
    },
    {
      title: req.title,
      description: req.description,
      content: req.content,
      commentCount: req.commentCount,
      likeCount: req.likeCount,
      isAd: req.isAd,
    },
    { upsert: true }
  );
};

const list = async (req, res) => {
  if (!isValidString(req.params.keywordId) || isEmptyString(req.params.keywordId)) {
    return res.status(400).send({ message: "[InvalidKeywordId] Error occured" });
  }
  if (!isValidString(req.query.includedKeyword)) {
    return res.status(400).send({ message: "[InvalidIncludedKeyword] Error occured" });
  }
  if (!isValidString(req.query.excludedKeyword)) {
    return res.status(400).send({ message: "[InvalidExcludedKeyword] Error occured" });
  }
  if (!isValidNumber(Number(req.query.limit)) || Number(req.query.limit) <= 0) {
    return res.status(400).send({ message: "[InvalidLimit] Error occured" });
  }
  if (!isValidString(req.query.cursorId)) {
    return res.status(400).send({ message: "[InvalidCursorId] Error occured" });
  }

  const hasKeywordId = (await keywordModel.findOne({ _id: req.params.keywordId })) !== null;
  if (!hasKeywordId) {
    return res.status(400).send({ message: "[NotExistedKeywordId] Error occured" });
  }
  if (!isEmptyString(req.query.cursorId)) {
    const hasCursorId = (await postModel.findOne({ _id: req.query.cursorId })) !== null;
    if (!hasCursorId) {
      return res.status(400).send({ message: "[NotExistedCursorId] Error occured" });
    }
  }

  const keywordId = req.params.keywordId;
  const { includedKeyword, excludedKeyword, cursorId } = req.query;
  const includedKeywordList = includedKeyword.split(",").join("|");
  const excludedKeywordList = excludedKeyword.split(",").join("|");
  const limit = Number(req.query.limit);
  let hasNext = false;
  let postListResult;
  const contentFilter = isEmptyString(excludedKeywordList)
    ? {
        $regex: includedKeywordList,
      }
    : {
        $regex: includedKeywordList,
        $not: { $regex: excludedKeywordList },
      };

  try {
    if (isEmptyString(cursorId)) {
      postListResult = await postModel
        .find({ keywordId })
        .find({ content: contentFilter })
        .sort({ _id: -1 })
        .limit(limit);
    } else {
      postListResult = await postModel
        .find({ keywordId })
        .find({ content: contentFilter })
        .find({ _id: { $lt: cursorId } })
        .sort({ _id: -1 })
        .limit(limit);
    }

    const nextCursorId = postListResult[postListResult.length - 1]?._id;
    const nextPostResult = await postModel
      .find({ keywordId })
      .find({
        content: contentFilter,
      })
      .findOne({ _id: { $lt: nextCursorId } });

    if (nextPostResult !== null) {
      hasNext = true;
    }

    return res.status(200).json({
      items: postListResult,
      nextCursorId,
      hasNext,
    });
  } catch {
    return res
      .status(500)
      .send({ message: "[ServerError] Error occured in 'postController.list'" });
  }
};

const today = async (req, res) => {
  if (!isValidString(req.params.keywordId) || isEmptyString(req.params.keywordId)) {
    return res.status(400).send({ message: "[InvalidKeywordId] Error occured" });
  }

  const keywordInfo = await keywordModel.findOne({ _id: req.params.keywordId }).exec();
  if (keywordInfo === null) {
    return res.status(400).send({ message: "[NotExistedKeywordId] Error occured" });
  }

  const keywordId = req.params.keywordId;

  try {
    const today = new Date();
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);

    const todayPostCount = await postModel
      .find({ keywordId })
      .find({
        createdAt: {
          $gte: new Date().setHours(0, 0, 0, 0),
          $lt: new Date().setHours(23, 59, 59, 999),
        },
      })
      .countDocuments()
      .exec();
    const yesterdayPostCount = await postModel
      .find({ keywordId })
      .find({
        createdAt: {
          $gte: new Date(yesterday).setHours(0, 0, 0, 0),
          $lt: new Date(yesterday).setHours(23, 59, 59, 999),
        },
      })
      .countDocuments()
      .exec();

    return res.status(200).json({
      id: keywordId,
      keyword: keywordInfo.keyword,
      todayPostCount,
      diffPostCount: (todayPostCount - yesterdayPostCount).toString(),
    });
  } catch {
    return res
      .status(500)
      .send({ message: "[ServerError] Error occured in 'postController.today'" });
  }
};

const postCount = async (req, res) => {
  if (!isValidString(req.params.keywordId) || isEmptyString(req.params.keywordId)) {
    return res.status(400).send({ message: "[InvalidKeywordId] Error occured" });
  }

  const keywordInfo = await keywordModel.findOne({ _id: req.params.keywordId }).exec();
  if (keywordInfo === null) {
    return res.status(400).send({ message: "[NotExistedKeywordId] Error occured" });
  }

  const keywordId = req.params.keywordId;

  let cursorIdDate;
  if (isValidString(req.query.cursorId)) {
    if (isEmptyString(req.query.cursorId)) {
      cursorIdDate = new Date();
      cursorIdDate.setDate(cursorIdDate.getDate() - 1 - cursorIdDate.getDay());
      cursorIdDate.setHours(0, 0, 0, 0);
      cursorIdDate = cursorIdDate.toISOString();
    } else {
      cursorIdDate = req.query.cursorId;
    }
  } else {
    return res.status(400).send({ message: "[InvalidCursorId] Error occured" });
  }

  try {
    const [cursorStartDate, cursorEndDate] = getCursorWeek(cursorIdDate);

    const result = await postModel.aggregate([
      { $match: { keywordId } },
      {
        $match: {
          $and: [{ createdAt: { $gte: cursorStartDate } }, { createdAt: { $lte: cursorEndDate } }],
        },
      },
      {
        $group: {
          _id: { $dateToString: { date: "$createdAt", format: "%Y.%m.%d", timezone: "+09:00" } },
          postCount: { $sum: 1 },
        },
      },
      { $addFields: { date: "$_id" } },
      { $project: { _id: 0 } },
    ]);

    if (result.length < DAY_OF_WEEK) {
      let index = 0;

      while (index < DAY_OF_WEEK) {
        const targetDate = new Date(cursorStartDate);
        targetDate.setDate(targetDate.getDate() + index);
        const transformedTargetMonth =
          (targetDate.getMonth() + 1).toString().length === 1
            ? (targetDate.getMonth() + 1).toString().padStart(2, "0")
            : (targetDate.getMonth() + 1).toString();
        const transformedTargetDate =
          targetDate.getDate().toString().length === 1
            ? targetDate.getDate().toString().padStart(2, "0")
            : targetDate.getDate().toString();
        const targetDateString = `${targetDate.getFullYear()}.${transformedTargetMonth}.${transformedTargetDate}`;

        const hasTargetDate = result
          .map((item) => item.date)
          .some((date) => date === targetDateString);
        if (!hasTargetDate) {
          result.push({
            postCount: 0,
            date: targetDateString,
          });
        }

        index += 1;
      }
    }

    result.sort((a, b) => new Date(a.date) - new Date(b.date));
    const dates = result.map((item) => item.date);
    const postCountList = result.map((item) => item.postCount);

    const [previousStartDate, previousEndDate] = getCursorWeek(cursorIdDate, -DAY_OF_WEEK);
    const [nextStartDate, nextEndDate] = getCursorWeek(cursorIdDate, +DAY_OF_WEEK);

    const previousCursorId = new Date(previousStartDate);
    previousCursorId.setDate(previousStartDate.getDate() - 1);
    const nextCursorId = new Date(nextStartDate);
    nextCursorId.setDate(nextStartDate.getDate() - 1);

    const hasPreviousPosts =
      (await postModel
        .find({ keywordId })
        .find({
          $and: [{ createdAt: { $lte: previousEndDate } }],
        })
        .countDocuments()
        .exec()) > 0;
    const hasNextPosts =
      (await postModel
        .find({ keywordId })
        .find({
          $and: [{ createdAt: { $gte: nextStartDate } }],
        })
        .countDocuments()
        .exec()) > 0;

    return res.status(200).json({
      keywordId,
      keyword: keywordInfo.keyword,
      dates,
      postCountList,
      cursorId: cursorIdDate,
      previousCursorId,
      nextCursorId,
      hasPrevious: hasPreviousPosts,
      hasNext: hasNextPosts,
    });
  } catch {
    return res
      .status(500)
      .send({ message: "[ServerError] Error occured in 'postController.postCount'" });
  }
};

const reactionCount = async (req, res) => {
  if (!isValidString(req.params.keywordId) || isEmptyString(req.params.keywordId)) {
    return res.status(400).send({ message: "[InvalidKeywordId] Error occured" });
  }

  const keywordInfo = await keywordModel.findOne({ _id: req.params.keywordId }).exec();
  if (keywordInfo === null) {
    return res.status(400).send({ message: "[InvalidKeywordId] Error occured" });
  }

  let cursorIdDate;
  if (isValidString(req.query.cursorId)) {
    if (isEmptyString(req.query.cursorId)) {
      cursorIdDate = new Date();
      cursorIdDate.setDate(cursorIdDate.getDate() - 1 - cursorIdDate.getDay());
      cursorIdDate.setHours(0, 0, 0, 0);
      cursorIdDate = cursorIdDate.toISOString();
    } else {
      cursorIdDate = req.query.cursorId;
    }
  } else {
    return res.status(400).send({ message: "[InvalidCursorId] Error occured" });
  }

  const keywordId = req.params.keywordId;

  try {
    const [cursorStartDate, cursorEndDate] = getCursorWeek(cursorIdDate, 0);

    const reactionCountListByPeriod = await postModel.aggregate([
      { $match: { keywordId } },
      {
        $match: {
          $and: [{ createdAt: { $gte: cursorStartDate } }, { createdAt: { $lte: cursorEndDate } }],
        },
      },
      {
        $group: {
          _id: { $dateToString: { date: "$createdAt", format: "%Y.%m.%d", timezone: "+09:00" } },
          likeCount: { $sum: "$likeCount" },
          commentCount: { $sum: "$commentCount" },
        },
      },
      { $addFields: { date: "$_id" } },
      { $project: { _id: 0 } },
    ]);

    if (reactionCountListByPeriod.length < DAY_OF_WEEK) {
      let index = 0;

      while (index < DAY_OF_WEEK) {
        const targetDateString = getTargetDateString(cursorStartDate, index);
        const hasTargetDate = reactionCountListByPeriod
          .map((item) => item.date)
          .some((date) => date === targetDateString);

        if (!hasTargetDate) {
          reactionCountListByPeriod.push({
            likeCount: 0,
            commentCount: 0,
            date: targetDateString,
          });
        }

        index += 1;
      }
    }

    reactionCountListByPeriod.sort((a, b) => new Date(a.date) - new Date(b.date));

    const dates = reactionCountListByPeriod.map((item) => item.date);
    const likeCountList = reactionCountListByPeriod.map((item) => item.likeCount);
    const commentCountList = reactionCountListByPeriod.map((item) => item.commentCount);

    const [previousStartDate, previousEndDate] = getCursorWeek(cursorIdDate, -DAY_OF_WEEK);
    const [nextStartDate, nextEndDate] = getCursorWeek(cursorIdDate, +DAY_OF_WEEK);

    const previousCursorId = new Date(previousStartDate);
    previousCursorId.setDate(previousStartDate.getDate() - 1);
    const nextCursorId = new Date(nextStartDate);
    nextCursorId.setDate(nextCursorId.getDate() - 1);

    const hasPreviousPosts =
      (await postModel
        .find({ keywordId })
        .find({ createdAt: { $lte: previousEndDate } })
        .countDocuments()
        .exec()) > 0;
    const hasNextPosts =
      (await postModel
        .find({ keywordId })
        .find({ createdAt: { $gte: nextStartDate } })
        .countDocuments()
        .exec()) > 0;

    res.status(200).json({
      keywordId,
      keyword: keywordInfo.keyword,
      dates,
      items: { likeCountList, commentCountList },
      cursorId: cursorIdDate,
      previousCursorId,
      nextCursorId,
      hasPrevious: hasPreviousPosts,
      hasNext: hasNextPosts,
    });
  } catch {
    return res
      .status(500)
      .send({ message: "[ServerError] Error occured in 'postController.reactionCount'" });
  }
};

const groupPostCount = async (req, res) => {
  if (!isValidString(req.params.groupId) || isEmptyString(req.params.groupId)) {
    return res.status(400).send({ message: "[InvalidGroupId] Error occured" });
  }

  const groupInfo = await groupModel.findOne({ _id: req.params.groupId }).exec();
  if (groupInfo === null) {
    return res.status(400).send({ message: "[NotExistedGroupId] Error occured" });
  }

  const groupId = req.params.groupId;

  let cursorIdDate;
  if (isValidString(req.query.cursorId)) {
    if (isEmptyString(req.query.cursorId)) {
      cursorIdDate = new Date();
      cursorIdDate.setDate(cursorIdDate.getDate() - 1 - cursorIdDate.getDay());
      cursorIdDate.setHours(0, 0, 0, 0);
      cursorIdDate = cursorIdDate.toISOString();
    } else {
      cursorIdDate = req.query.cursorId;
    }
  } else {
    return res.status(400).send({ message: "[InvalidCursorId] Error occured" });
  }

  try {
    const group = await groupModel.findById(groupId).exec();
    const keywordIdList = group.keywordIdList;
    const [cursorStartDate, cursorEndDate] = getCursorWeek(cursorIdDate);

    let allKeywordsResult = [];

    for await (const keywordId of keywordIdList) {
      const stringifiedKeywordId = keywordId.toString();
      const keywordResult = await postModel.aggregate([
        { $match: { keywordId: stringifiedKeywordId } },
        {
          $match: {
            $and: [
              { createdAt: { $gte: cursorStartDate } },
              { createdAt: { $lte: cursorEndDate } },
            ],
          },
        },
        {
          $group: {
            _id: { $dateToString: { date: "$createdAt", format: "%Y.%m.%d", timezone: "+09" } },
            postCount: { $sum: 1 },
          },
        },
        { $addFields: { date: "$_id" } },
        { $project: { _id: 0 } },
      ]);

      if (keywordResult.length < DAY_OF_WEEK) {
        let index = 0;

        while (index < DAY_OF_WEEK) {
          const targetDate = new Date(cursorIdDate);
          targetDate.setDate(targetDate.getDate() + index + 1);
          const transformedTargetMonth =
            (targetDate.getMonth() + 1).toString().length === 1
              ? (targetDate.getMonth() + 1).toString().padStart(2, "0")
              : (targetDate.getMonth() + 1).toString();
          const transformedTargetDate =
            targetDate.getDate().toString().length === 1
              ? targetDate.getDate().toString().padStart(2, "0")
              : targetDate.getDate().toString();
          const targetDateString = `${targetDate.getFullYear()}.${transformedTargetMonth}.${transformedTargetDate}`;

          const hasTargetDate = keywordResult.some((result) => result.date === targetDateString);
          if (!hasTargetDate) {
            keywordResult.push({
              postCount: 0,
              date: targetDateString,
            });
          }

          index += 1;
        }
      }

      keywordResult.sort((a, b) => new Date(a.date) - new Date(b.date));

      const keyword = await keywordModel.findOne({ _id: keywordId }).exec();
      const keywordName = keyword.keyword;
      const postCountList = keywordResult.map((item) => item.postCount);
      const dates = keywordResult.map((item) => item.date);

      allKeywordsResult.push({
        name: keywordName,
        postCountList,
        dates,
      });
    }

    const [previousStartDate, previousEndDate] = getCursorWeek(cursorIdDate, -DAY_OF_WEEK);
    const [nextStartDate] = getCursorWeek(cursorIdDate, +DAY_OF_WEEK);

    const previousCursorId = new Date(previousStartDate);
    previousCursorId.setDate(previousStartDate.getDate() - 1);
    const nextCursorId = new Date(nextStartDate);
    nextCursorId.setDate(nextStartDate.getDate() - 1);

    let previousKeywordsPostsNum = [];
    for await (const keywordId of keywordIdList) {
      const previousKeywordPostsNum = await postModel
        .find({ keywordId })
        .find({ createdAt: { $lte: previousEndDate } })
        .countDocuments()
        .exec();

      previousKeywordsPostsNum.push(previousKeywordPostsNum);
    }

    const hasPreviousPosts = previousKeywordsPostsNum.some((postNum) => postNum > 0);

    let nextKeywordsPostsNum = [];
    for await (const keywordId of keywordIdList) {
      const nextKeywordPostsNum = await postModel
        .find({ keywordId })
        .find({ createdAt: { $gte: nextStartDate } })
        .countDocuments()
        .exec();

      nextKeywordsPostsNum.push(nextKeywordPostsNum);
    }

    const hasNextPosts = nextKeywordsPostsNum.some((postNum) => postNum > 0);

    return res.status(200).json({
      groupId,
      keywordIdList,
      items: allKeywordsResult,
      hasPrevious: hasPreviousPosts,
      hasNext: hasNextPosts,
      cursorId: cursorIdDate,
      previousCursorId,
      nextCursorId,
    });
  } catch {
    return res
      .status(500)
      .send({ message: "[ServerError] Error occured in 'postController.groupPostCount'" });
  }
};

const groupLikeCount = async (req, res) => {
  if (!isValidString(req.params.groupId) || isEmptyString(req.params.groupId)) {
    return res.status(400).send({ message: "[InvalidGroupId] Error occured" });
  }

  const groupInfo = await groupModel.findOne({ _id: req.params.groupId }).exec();
  if (groupInfo === null) {
    return res.status(400).send({ message: "[NotExistedGroupId] Error occured" });
  }

  const groupId = req.params.groupId;

  let cursorIdDate;
  if (isValidString(req.query.cursorId)) {
    if (isEmptyString(req.query.cursorId)) {
      cursorIdDate = new Date();
      cursorIdDate.setDate(cursorIdDate.getDate() - 1 - cursorIdDate.getDay());
      cursorIdDate.setHours(0, 0, 0, 0);
      cursorIdDate = cursorIdDate.toISOString();
    } else {
      cursorIdDate = req.query.cursorId;
    }
  } else {
    return res.status(400).send({ message: "[InvalidCursorId] Error occured" });
  }

  try {
    const group = await groupModel.findById(groupId).exec();
    const keywordIdList = group.keywordIdList;
    const [cursorStartDate, cursorEndDate] = getCursorWeek(cursorIdDate);

    let allKeywordsResult = [];

    for await (const keywordId of keywordIdList) {
      const stringifiedKeywordId = keywordId.toString();
      const keywordResult = await postModel.aggregate([
        { $match: { keywordId: stringifiedKeywordId } },
        {
          $match: {
            $and: [
              { createdAt: { $gte: cursorStartDate } },
              { createdAt: { $lte: cursorEndDate } },
            ],
          },
        },
        {
          $group: {
            _id: { $dateToString: { date: "$createdAt", format: "%Y.%m.%d", timezone: "+09" } },
            likeCount: { $sum: "$likeCount" },
          },
        },
        { $addFields: { date: "$_id" } },
        { $project: { _id: 0 } },
      ]);

      if (keywordResult.length < DAY_OF_WEEK) {
        let index = 0;

        while (index < DAY_OF_WEEK) {
          const targetDate = new Date(cursorIdDate);
          targetDate.setDate(targetDate.getDate() + index + 1);
          const transformedTargetMonth =
            (targetDate.getMonth() + 1).toString().length === 1
              ? (targetDate.getMonth() + 1).toString().padStart(2, "0")
              : (targetDate.getMonth() + 1).toString();
          const transformedTargetDate =
            targetDate.getDate().toString().length === 1
              ? targetDate.getDate().toString().padStart(2, "0")
              : targetDate.getDate().toString();
          const targetDateString = `${targetDate.getFullYear()}.${transformedTargetMonth}.${transformedTargetDate}`;

          const hasTargetDate = keywordResult.some((result) => result.date === targetDateString);
          if (!hasTargetDate) {
            keywordResult.push({
              likeCount: 0,
              date: targetDateString,
            });
          }

          index += 1;
        }
      }

      keywordResult.sort((a, b) => new Date(a.date) - new Date(b.date));

      const keyword = await keywordModel.findOne({ _id: keywordId }).exec();
      const keywordName = keyword.keyword;
      const likeCountList = keywordResult.map((item) => item.likeCount);
      const dates = keywordResult.map((item) => item.date);

      allKeywordsResult.push({
        name: keywordName,
        likeCountList,
        dates,
      });
    }

    const [previousStartDate, previousEndDate] = getCursorWeek(cursorIdDate, -DAY_OF_WEEK);
    const [nextStartDate] = getCursorWeek(cursorIdDate, +DAY_OF_WEEK);

    const previousCursorId = new Date(previousStartDate);
    previousCursorId.setDate(previousStartDate.getDate() - 1);
    const nextCursorId = new Date(nextStartDate);
    nextCursorId.setDate(nextStartDate.getDate() - 1);

    let previousKeywordsPostsNum = [];
    for await (const keywordId of keywordIdList) {
      const previousKeywordPostsNum = await postModel
        .find({ keywordId })
        .find({ createdAt: { $lte: previousEndDate } })
        .countDocuments()
        .exec();

      previousKeywordsPostsNum.push(previousKeywordPostsNum);
    }

    const hasPreviousPosts = previousKeywordsPostsNum.some((postNum) => postNum > 0);

    let nextKeywordsPostsNum = [];
    for await (const keywordId of keywordIdList) {
      const nextKeywordPostsNum = await postModel
        .find({ keywordId })
        .find({ createdAt: { $gte: nextStartDate } })
        .countDocuments()
        .exec();

      nextKeywordsPostsNum.push(nextKeywordPostsNum);
    }

    const hasNextPosts = nextKeywordsPostsNum.some((postNum) => postNum > 0);

    return res.status(200).json({
      groupId,
      keywordIdList,
      items: allKeywordsResult,
      hasPrevious: hasPreviousPosts,
      hasNext: hasNextPosts,
      cursorId: cursorIdDate,
      previousCursorId,
      nextCursorId,
    });
  } catch {
    return res
      .status(500)
      .send({ message: "[ServerError] Error occured in 'postController.groupLikeCount'" });
  }
};

const groupCommentCount = async (req, res) => {
  if (!isValidString(req.params.groupId) || isEmptyString(req.params.groupId)) {
    return res.status(400).send({ message: "[InvalidGroupId] Error occured" });
  }

  const groupInfo = await groupModel.findOne({ _id: req.params.groupId }).exec();
  if (groupInfo === null) {
    return res.status(400).send({ message: "[NotExistedGroupId] Error occured" });
  }

  const groupId = req.params.groupId;

  let cursorIdDate;
  if (isValidString(req.query.cursorId)) {
    if (isEmptyString(req.query.cursorId)) {
      cursorIdDate = new Date();
      cursorIdDate.setDate(cursorIdDate.getDate() - 1 - cursorIdDate.getDay());
      cursorIdDate.setHours(0, 0, 0, 0);
      cursorIdDate = cursorIdDate.toISOString();
    } else {
      cursorIdDate = req.query.cursorId;
    }
  } else {
    return res.status(400).send({ message: "[InvalidCursorId] Error occured" });
  }

  try {
    const group = await groupModel.findById(groupId).exec();
    const keywordIdList = group.keywordIdList;
    const [cursorStartDate, cursorEndDate] = getCursorWeek(cursorIdDate);

    let allKeywordsResult = [];

    for await (const keywordId of keywordIdList) {
      const stringifiedKeywordId = keywordId.toString();
      const keywordResult = await postModel.aggregate([
        { $match: { keywordId: stringifiedKeywordId } },
        {
          $match: {
            $and: [
              { createdAt: { $gte: cursorStartDate } },
              { createdAt: { $lte: cursorEndDate } },
            ],
          },
        },
        {
          $group: {
            _id: { $dateToString: { date: "$createdAt", format: "%Y.%m.%d", timezone: "+09" } },
            commentCount: { $sum: "$commentCount" },
          },
        },
        { $addFields: { date: "$_id" } },
        { $project: { _id: 0 } },
      ]);

      if (keywordResult.length < DAY_OF_WEEK) {
        let index = 0;

        while (index < DAY_OF_WEEK) {
          const targetDate = new Date(cursorIdDate);
          targetDate.setDate(targetDate.getDate() + index + 1);
          const transformedTargetMonth =
            (targetDate.getMonth() + 1).toString().length === 1
              ? (targetDate.getMonth() + 1).toString().padStart(2, "0")
              : (targetDate.getMonth() + 1).toString();
          const transformedTargetDate =
            targetDate.getDate().toString().length === 1
              ? targetDate.getDate().toString().padStart(2, "0")
              : targetDate.getDate().toString();
          const targetDateString = `${targetDate.getFullYear()}.${transformedTargetMonth}.${transformedTargetDate}`;

          const hasTargetDate = keywordResult.some((result) => result.date === targetDateString);
          if (!hasTargetDate) {
            keywordResult.push({
              commentCount: 0,
              date: targetDateString,
            });
          }

          index += 1;
        }
      }

      keywordResult.sort((a, b) => new Date(a.date) - new Date(b.date));

      const keyword = await keywordModel.findOne({ _id: keywordId }).exec();
      const keywordName = keyword.keyword;
      const commentCountList = keywordResult.map((item) => item.commentCount);
      const dates = keywordResult.map((item) => item.date);

      allKeywordsResult.push({
        name: keywordName,
        commentCountList,
        dates,
      });
    }

    const [previousStartDate, previousEndDate] = getCursorWeek(cursorIdDate, -DAY_OF_WEEK);
    const [nextStartDate] = getCursorWeek(cursorIdDate, +DAY_OF_WEEK);

    const previousCursorId = new Date(previousStartDate);
    previousCursorId.setDate(previousStartDate.getDate() - 1);
    const nextCursorId = new Date(nextStartDate);
    nextCursorId.setDate(nextStartDate.getDate() - 1);

    let previousKeywordsPostsNum = [];
    for await (const keywordId of keywordIdList) {
      const previousKeywordPostsNum = await postModel
        .find({ keywordId })
        .find({ createdAt: { $lte: previousEndDate } })
        .countDocuments()
        .exec();

      previousKeywordsPostsNum.push(previousKeywordPostsNum);
    }

    const hasPreviousPosts = previousKeywordsPostsNum.some((postNum) => postNum > 0);

    let nextKeywordsPostsNum = [];
    for await (const keywordId of keywordIdList) {
      const nextKeywordPostsNum = await postModel
        .find({ keywordId })
        .find({ createdAt: { $gte: nextStartDate } })
        .countDocuments()
        .exec();

      nextKeywordsPostsNum.push(nextKeywordPostsNum);
    }

    const hasNextPosts = nextKeywordsPostsNum.some((postNum) => postNum > 0);

    return res.status(200).json({
      groupId,
      keywordIdList,
      items: allKeywordsResult,
      hasPrevious: hasPreviousPosts,
      hasNext: hasNextPosts,
      cursorId: cursorIdDate,
      previousCursorId,
      nextCursorId,
    });
  } catch {
    return res
      .status(500)
      .send({ message: "[ServerError] Error occured in 'postController.groupCommentCount'" });
  }
};

module.exports = {
  upsert,
  list,
  today,
  postCount,
  reactionCount,
  groupPostCount,
  groupLikeCount,
  groupCommentCount,
};
