const keywordModel = require("../models/keywordModel");
const userModel = require("../models/userModel");
const { isValidString } = require("../utils/validation");

const create = async (req, res) => {
  if (!isValidString(req.body.uid)) {
    return res.status(400).send({ message: "[InvalidUid] Error occured" });
  }
  if (!isValidString(req.body.email)) {
    return res.status(400).send({ message: "[InvalidEmail] Error occured" });
  }
  if (!isValidString(req.body.displayName)) {
    return res.status(400).send({ message: "[InvalidDisplayName] Error occured" });
  }
  if (!isValidString(req.body.photoURL)) {
    return res.status(400).send({ message: "[InvalidPhotoURL] Error occured" });
  }

  const { uid, email, displayName, photoURL } = req.body;
  const isNewUser = (await userModel.find({ uid })).length === 0;

  try {
    if (isNewUser) {
      const userCreated = await userModel.create({ uid, email, displayName, photoURL });

      return res.status(201).json({ userCreated });
    } else {
      const userUpdated = await userModel.findOneAndUpdate(
        { uid },
        { $set: { lastSignInAt: new Date() } },
        { new: true }
      );

      return res.status(201).json({ userUpdated });
    }
  } catch (error) {
    return res
      .status(500)
      .send({ message: "[ServerError] Error occured in 'userController.create'" });
  }
};

module.exports = { create };
