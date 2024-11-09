const keywordModel = require("../models/keywordModel");
const userModel = require("../models/userModel");
const { isValidString, isBlank } = require("../utils/validation");

const create = async (req, res) => {
  if (!isValidString(req.body.uid) || isBlank(req.body.uid)) {
    return res.status(400).send({ message: "[InvalidUid] Error occured" });
  }
  if (!isValidString(req.body.email) || isBlank(req.body.email)) {
    return res.status(400).send({ message: "[InvalidEmail] Error occured" });
  }
  if (!isValidString(req.body.displayName) || isBlank(req.body.displayName)) {
    return res.status(400).send({ message: "[InvalidDisplayName] Error occured" });
  }
  if (!isValidString(req.body.photoURL) || isBlank(req.body.photoURL)) {
    return res.status(400).send({ message: "[InvalidPhotoURL] Error occured" });
  }

  const { uid, email, displayName, photoURL } = req.body;

  try {
    const userResult = await userModel.findOneAndUpdate(
      { uid },
      {
        $setOnInsert: {
          email,
          displayName,
          photoURL,
        },
      },
      { upsert: true, new: true }
    );
    return res.status(201).json({ userResult });
  } catch (error) {
    return res
      .status(500)
      .send({ message: "[ServerError] Error occured in 'userController.create'" });
  }
};

module.exports = { create };
