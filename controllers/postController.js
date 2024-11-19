const postModel = require("../models/postModel");
const keywordModel = require("../models/keywordModel");
const {
  isValidString,
  isValidNumber,
  isEmptyString,
  isValidBoolean,
} = require("../utils/validation");
const {
  getCursorIdDate,
  getCursorWeek,
  getCursorPeriod,
  getTargetDateString,
  getPreviousCursorIdDate,
  getNextCursorIdDate,
} = require("../utils/date");
const { DAY_OF_WEEK, PERIOD } = require("../config/constants");
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
  if (!isValidString(req.query.order) || isEmptyString(req.query.order)) {
    return res.status(400).send({ message: "[InvalidOrder] Error occured" });
  }
  if (!isValidString(req.query.includedKeyword)) {
    return res.status(400).send({ message: "[InvalidIncludedKeyword] Error occured" });
  }
  if (!isValidString(req.query.excludedKeyword)) {
    return res.status(400).send({ message: "[InvalidExcludedKeyword] Error occured" });
  }
  if (!isValidString(req.query.isAd)) {
    return res.status(400).send({ message: "[InvalidIsAd] Error occured" });
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
  const { order, includedKeyword, excludedKeyword, cursorId, isAd } = req.query;
  const includedKeywordList = includedKeyword.split(",").join("|");
  const excludedKeywordList = excludedKeyword.split(",").join("|");
  const limit = Number(req.query.limit);
  let hasNext = false;

  const getSortQuery = (param) => {
    switch (param) {
      case "NEWEST":
        return { _id: -1 };

      case "LIKE":
        return { likeCount: -1, _id: -1 };

      case "COMMENT":
        return { commentCount: -1, _id: -1 };
    }
  };

  const contentFilter = isEmptyString(excludedKeywordList)
    ? {
        $regex: includedKeywordList,
      }
    : {
        $regex: includedKeywordList,
        $not: { $regex: excludedKeywordList },
      };

  const getAdFilter = (param) => {
    switch (param) {
      case "":
        return { $or: [{ isAd: true }, { isAd: false }] };

      case "true":
        return { isAd: true };

      case "false":
        return { isAd: false };
    }
  };

  const getOrderQuery = async (param, cursorId) => {
    switch (param) {
      case "LIKE":
        const { likeCount: likeCountOfCursor } = await postModel.findById({ _id: cursorId }).exec();
        return {
          $or: [
            { likeCount: { $lt: likeCountOfCursor } },
            { likeCount: { $eq: likeCountOfCursor }, _id: { $lt: cursorId } },
          ],
        };
      case "COMMENT":
        const { commentCount: commentCountOfCursor } = await postModel
          .findById({ _id: cursorId })
          .exec();
        return {
          $or: [
            { commentCount: { $lt: commentCountOfCursor } },
            { commentCount: { $eq: commentCountOfCursor }, _id: { $lt: cursorId } },
          ],
        };
    }
  };

  try {
    let postListResult;

    if (isEmptyString(cursorId)) {
      postListResult = await postModel.aggregate([
        { $match: { keywordId, content: contentFilter, ...getAdFilter(isAd) } },
        { $sort: getSortQuery(order) },
        { $limit: limit },
      ]);
    } else {
      const { _id: cursorObjectId } = await postModel.findById({ _id: cursorId }).exec();
      const orderQuery = await getOrderQuery(order, cursorObjectId);
      postListResult = await postModel.aggregate([
        {
          $match: {
            keywordId,
            content: contentFilter,
            ...getAdFilter(isAd),
          },
        },
        { $sort: getSortQuery(order) },
        {
          $match: order === "NEWEST" ? { _id: { $lt: cursorObjectId } } : orderQuery,
        },
        { $limit: limit },
      ]);
    }

    let nextCursorId;
    if (postListResult.length > 0) {
      nextCursorId = postListResult[postListResult.length - 1]?._id;
      const nextOrderQuery = await getOrderQuery(order, nextCursorId);
      const nextPostResult = await postModel.aggregate([
        {
          $match: {
            keywordId,
            content: contentFilter,
            ...getAdFilter(isAd),
          },
        },
        { $sort: getSortQuery(order) },
        {
          $match: order === "NEWEST" ? { _id: { $lt: nextCursorId } } : nextOrderQuery,
        },
      ]);

      if (nextPostResult.length > 0) {
        hasNext = true;
      }
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
          $lte: new Date().setHours(23, 59, 59, 999),
        },
      })
      .countDocuments()
      .exec();
    const yesterdayPostCount = await postModel
      .find({ keywordId })
      .find({
        createdAt: {
          $gte: new Date(yesterday).setHours(0, 0, 0, 0),
          $lte: new Date(yesterday).setHours(23, 59, 59, 999),
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

  let period;
  if (isValidString(req.query.period)) {
    if (isEmptyString(req.query.period)) {
      period = PERIOD.WEEKLY;
    } else {
      period = req.query.period;
    }
  } else {
    return res.status(400).send({ message: "[InvalidPeriod] Error occured" });
  }

  let cursorIdDate;
  if (isValidString(req.query.cursorId)) {
    if (isEmptyString(req.query.cursorId)) {
      cursorIdDate = getCursorIdDate(period);
    } else {
      cursorIdDate = req.query.cursorId;
    }
  } else {
    return res.status(400).send({ message: "[InvalidCursorId] Error occured" });
  }

  const keywordId = req.params.keywordId;

  try {
    const [cursorStartDate, cursorEndDate, periodLength] = getCursorPeriod(cursorIdDate, period);
    const dateFilter =
      period === PERIOD.MONTHLY_WEEKLY
        ? {
            $dateTrunc: {
              date: "$createdAt",
              unit: "week",
              binSize: 1,
              timezone: "+09:00",
              startOfWeek: "sunday",
            },
          }
        : "$createdAt";

    const postCountListByPeriod = await postModel.aggregate([
      { $match: { keywordId } },
      {
        $match: {
          $and: [{ createdAt: { $gte: cursorStartDate } }, { createdAt: { $lte: cursorEndDate } }],
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              date: dateFilter,
              format: "%Y.%m.%d",
              timezone: "+09:00",
            },
          },
          postCount: { $sum: 1 },
        },
      },
      { $addFields: { date: "$_id" } },
      { $project: { _id: 0 } },
    ]);

    if (postCountListByPeriod.length < periodLength) {
      let addedDate = 0;
      let periodUnit = period === PERIOD.MONTHLY_WEEKLY ? 7 : 1;

      while (addedDate < periodLength) {
        const targetDateString = getTargetDateString(cursorStartDate, addedDate * periodUnit);
        const hasTargetDate = postCountListByPeriod
          .map((item) => item.date)
          .some((date) => date === targetDateString);

        if (!hasTargetDate) {
          postCountListByPeriod.push({
            postCount: 0,
            date: targetDateString,
          });
        }

        addedDate += 1;
      }
    }

    postCountListByPeriod.sort((a, b) => new Date(a.date) - new Date(b.date));

    const dates = postCountListByPeriod.map((item) => item.date);
    const postCountList = postCountListByPeriod.map((item) => item.postCount);

    const previousCursorId = getPreviousCursorIdDate(cursorStartDate, period);
    const nextCursorId = getNextCursorIdDate(cursorEndDate);

    const hasPrevious =
      (await postModel
        .find({ keywordId })
        .find({ createdAt: { $lt: cursorStartDate } })
        .countDocuments()
        .exec()) > 0;
    const hasNext =
      (await postModel
        .find({ keywordId })
        .find({ createdAt: { $gt: cursorEndDate } })
        .countDocuments()
        .exec()) > 0;

    return res.status(200).json({
      keywordId,
      keyword: keywordInfo.keyword,
      period,
      dates,
      postCountList,
      cursorId: cursorIdDate,
      previousCursorId,
      nextCursorId,
      hasPrevious,
      hasNext,
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
    return res.status(400).send({ message: "[NotExistedKeywordId] Error occured" });
  }

  let period;
  if (isValidString(req.query.period)) {
    if (isEmptyString(req.query.period)) {
      period = PERIOD.WEEKLY;
    } else {
      period = req.query.period;
    }
  } else {
    return res.status(400).send({ message: "[InvalidPeriod] Error occured" });
  }

  let cursorIdDate;
  if (isValidString(req.query.cursorId)) {
    if (isEmptyString(req.query.cursorId)) {
      cursorIdDate = getCursorIdDate(period);
    } else {
      cursorIdDate = req.query.cursorId;
    }
  } else {
    return res.status(400).send({ message: "[InvalidCursorId] Error occured" });
  }

  const keywordId = req.params.keywordId;

  try {
    const [cursorStartDate, cursorEndDate, periodLength] = getCursorPeriod(cursorIdDate, period);
    const dateFilter =
      period === PERIOD.MONTHLY_WEEKLY
        ? {
            $dateTrunc: {
              date: "$createdAt",
              unit: "week",
              binSize: 1,
              timezone: "+09:00",
              startOfWeek: "sunday",
            },
          }
        : "$createdAt";

    const reactionCountListByPeriod = await postModel.aggregate([
      { $match: { keywordId } },
      {
        $match: {
          $and: [{ createdAt: { $gte: cursorStartDate } }, { createdAt: { $lte: cursorEndDate } }],
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              date: dateFilter,
              format: "%Y.%m.%d",
              timezone: "+09:00",
            },
          },
          likeCount: { $sum: "$likeCount" },
          commentCount: { $sum: "$commentCount" },
        },
      },
      { $addFields: { date: "$_id" } },
      { $project: { _id: 0 } },
    ]);

    if (reactionCountListByPeriod.length < periodLength) {
      let addedDate = 0;
      let periodUnit = period === PERIOD.MONTHLY_WEEKLY ? 7 : 1;

      while (addedDate < periodLength) {
        const targetDateString = getTargetDateString(cursorStartDate, addedDate * periodUnit);
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

        addedDate += 1;
      }
    }

    reactionCountListByPeriod.sort((a, b) => new Date(a.date) - new Date(b.date));

    const dates = reactionCountListByPeriod.map((item) => item.date);
    const likeCountList = reactionCountListByPeriod.map((item) => item.likeCount);
    const commentCountList = reactionCountListByPeriod.map((item) => item.commentCount);

    const previousCursorId = getPreviousCursorIdDate(cursorStartDate, period);
    const nextCursorId = getNextCursorIdDate(cursorEndDate);

    const hasPrevious =
      (await postModel
        .find({ keywordId })
        .find({ createdAt: { $lt: cursorStartDate } })
        .countDocuments()
        .exec()) > 0;
    const hasNext =
      (await postModel
        .find({ keywordId })
        .find({ createdAt: { $gt: cursorEndDate } })
        .countDocuments()
        .exec()) > 0;

    res.status(200).json({
      keywordId,
      keyword: keywordInfo.keyword,
      period,
      dates,
      items: { likeCountList, commentCountList },
      cursorId: cursorIdDate,
      previousCursorId,
      nextCursorId,
      hasPrevious,
      hasNext,
    });
  } catch {
    return res
      .status(500)
      .send({ message: "[ServerError] Error occured in 'postController.reactionCount'" });
  }
};

const adCount = async (req, res) => {
  if (!isValidString(req.params.keywordId) || isEmptyString(req.params.keywordId)) {
    return res.status(400).send({ message: "[InvalidKeywordId] Error occured" });
  }

  const keywordInfo = await keywordModel.findOne({ _id: req.params.keywordId }).exec();
  if (keywordInfo === null) {
    return res.status(400).send({ message: "[NotExistedKeywordId] Error occured" });
  }

  let period;
  if (isValidString(req.query.period)) {
    if (isEmptyString(req.query.period)) {
      period = PERIOD.WEEKLY;
    } else {
      period = req.query.period;
    }
  } else {
    return res.status(400).send({ message: "[InvalidPeriod] Error occured" });
  }

  let cursorIdDate;
  if (isValidString(req.query.cursorId)) {
    if (isEmptyString(req.query.cursorId)) {
      cursorIdDate = getCursorIdDate(period);
    } else {
      cursorIdDate = req.query.cursorId;
    }
  } else {
    return res.status(400).send({ message: "[InvalidCursorId] Error occured" });
  }

  const keywordId = req.params.keywordId;

  try {
    const [cursorStartDate, cursorEndDate, periodLength] = getCursorPeriod(cursorIdDate, period);
    const dateFilter =
      period === PERIOD.MONTHLY_WEEKLY
        ? {
            $dateTrunc: {
              date: "$createdAt",
              unit: "week",
              binSize: 1,
              timezone: "+09:00",
              startOfWeek: "sunday",
            },
          }
        : "$createdAt";

    const adCountListByPeriod = await postModel.aggregate([
      { $match: { keywordId } },
      {
        $match: {
          $and: [{ createdAt: { $gte: cursorStartDate } }, { createdAt: { $lte: cursorEndDate } }],
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              date: dateFilter,
              format: "%Y.%m.%d",
              timezone: "+09:00",
            },
          },
          adCount: {
            $sum: { $cond: { if: { $eq: ["$isAd", true] }, then: 1, else: 0 } },
          },
          nonAdCount: {
            $sum: { $cond: { if: { $eq: ["$isAd", false] }, then: 1, else: 0 } },
          },
        },
      },
      { $addFields: { date: "$_id" } },
      { $project: { _id: 0 } },
    ]);

    if (adCountListByPeriod.length < periodLength) {
      let addedDate = 0;
      let periodUnit = period === PERIOD.MONTHLY_WEEKLY ? 7 : 1;

      while (addedDate < periodLength) {
        const targetDateString = getTargetDateString(cursorStartDate, addedDate * periodUnit);
        const hasTargetDate = adCountListByPeriod
          .map((item) => item.date)
          .some((date) => date === targetDateString);

        if (!hasTargetDate) {
          adCountListByPeriod.push({
            adCount: 0,
            nonAdCount: 0,
            date: targetDateString,
          });
        }

        addedDate += 1;
      }
    }

    adCountListByPeriod.sort((a, b) => new Date(a.date) - new Date(b.date));

    const dates = adCountListByPeriod.map((item) => item.date);
    const adCountList = adCountListByPeriod.map((item) => item.adCount);
    const nonAdCountList = adCountListByPeriod.map((item) => item.nonAdCount);

    const previousCursorId = getPreviousCursorIdDate(cursorStartDate, period);
    const nextCursorId = getNextCursorIdDate(cursorEndDate);

    const hasPrevious =
      (await postModel
        .find({ keywordId })
        .find({ createdAt: { $lt: cursorStartDate } })
        .countDocuments()
        .exec()) > 0;
    const hasNext =
      (await postModel
        .find({ keywordId })
        .find({ createdAt: { $gt: cursorEndDate } })
        .countDocuments()
        .exec()) > 0;

    res.status(200).json({
      keywordId,
      keyword: keywordInfo.keyword,
      dates,
      items: { nonAdCountList, adCountList },
      cursorId: cursorIdDate,
      previousCursorId,
      nextCursorId,
      hasPrevious,
      hasNext,
    });
  } catch {
    return res
      .status(500)
      .send({ message: "[ServerError] Error occured in 'postController.adCount'" });
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
  adCount,
  groupPostCount,
  groupLikeCount,
  groupCommentCount,
};
