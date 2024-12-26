const { SAMPLE_GROUP_ID } = require("../config/constants");
const groupModel = require("../models/groupModel");
const keywordModel = require("../models/keywordModel");
const postModel = require("../models/postModel");
const userModel = require("../models/userModel");
const { isValidString, isEmptyString } = require("../utils/validation");

const create = async (req, res) => {
  if (!isValidString(req.body.uid) || isEmptyString(req.body.uid)) {
    return res.status(400).send({ message: "[InvalidUid] Error occured" });
  }
  if (!isValidString(req.body.email) || isEmptyString(req.body.email)) {
    return res.status(400).send({ message: "[InvalidEmail] Error occured" });
  }
  if (!isValidString(req.body.displayName) || isEmptyString(req.body.displayName)) {
    return res.status(400).send({ message: "[InvalidDisplayName] Error occured" });
  }
  if (!isValidString(req.body.photoURL) || isEmptyString(req.body.photoURL)) {
    return res.status(400).send({ message: "[InvalidPhotoURL] Error occured" });
  }

  const { uid, email, displayName, photoURL } = req.body;

  try {
    const isUnregisteredUser = (await userModel.exists({ uid }).exec()) === null;
    const userResult = await userModel
      .findOneAndUpdate(
        { uid },
        {
          $setOnInsert: {
            email,
            displayName,
            photoURL,
          },
        },
        { upsert: true, new: true }
      )
      .exec();

    if (isUnregisteredUser) {
      const sampleGroup = await groupModel.findById(SAMPLE_GROUP_ID).exec();

      if (sampleGroup.keywordIdList.length > 0) {
        const newKeywordIdList = [];

        for await (const sampleKeywordId of sampleGroup.keywordIdList) {
          const sampleKeyword = await keywordModel.findById(sampleKeywordId).exec();
          const samplePostList = await postModel
            .find({ keywordId: sampleKeywordId })
            .sort({ createdAt: 1 })
            .exec();

          const [newKeyword] = await keywordModel.create(
            [
              {
                keyword: sampleKeyword.keyword,
                ownerUid: userResult.uid,
                createdAt: sampleKeyword.createdAt,
                updatedAt: new Date(),
              },
            ],
            { timestamps: false }
          );

          if (samplePostList.length > 0) {
            for await (const samplePost of samplePostList) {
              await postModel.create(
                [
                  {
                    keywordId: newKeyword._id,
                    title: samplePost.title,
                    link: samplePost.link,
                    content: samplePost.content,
                    description: samplePost.description,
                    commentCount: samplePost.commentCount,
                    likeCount: samplePost.likeCount,
                    isAd: samplePost.isAd,
                    createdAt: samplePost.createdAt,
                    updatedAt: new Date(),
                  },
                ],
                { timestamps: false }
              );
            }
          }

          newKeywordIdList.push(newKeyword._id);
        }

        await groupModel.create(
          [
            {
              ownerUid: userResult.uid,
              name: sampleGroup.name,
              keywordIdList: newKeywordIdList,
              createdAt: sampleGroup.createdAt,
              updatedAt: new Date(),
            },
          ],
          { timestamps: false }
        );
      }
    }

    return res.status(201).json({ userResult });
  } catch {
    return res
      .status(500)
      .send({ message: "[ServerError] Error occured in 'userController.create'" });
  }
};

module.exports = { create };
