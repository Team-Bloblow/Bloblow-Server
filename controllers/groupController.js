const mongoose = require("mongoose");
const groupModel = require("../models/groupModel");
const keywordModel = require("../models/keywordModel");

const create = async (req, res) => {
  const { name, ownerId, keywordList, createdAt } = req.body;

  if (!name || !ownerId || !keywordList || !createdAt) {
    res.status(400).send({ message: "[Error: groupCreate] Content can not be empty!" });
  }

  try {
    const documentGroupCreated = await groupModel.create({
      name: name,
      ownerId: ownerId,
      keywordList: keywordList,
    });
    const { _id } = documentGroupCreated;
    const documentKeywordCreated = await keywordModel.create({
      keyword: keywordList[0],
      ownerId: ownerId,
    });

    res.status(201).json({ id: _id.toString(), keywordList: keywordList });
  } catch (error) {
    console.error("[Error: groupCreate] ", error);
    res.status(500).send(error);
  }
};

module.exports = { create };
