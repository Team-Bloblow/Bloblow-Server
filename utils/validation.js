const isValidString = (string) => {
  if (typeof string !== "string") {
    return false;
  }

  return true;
};

const isValidNumber = (number) => {
  if (typeof number !== "number") {
    return false;
  }

  return true;
};

const isEmptyString = (string) => {
  if (string.trim() === "") {
    return true;
  }

  return false;
};

const isValidArray = (array) => {
  if (Array.isArray(array)) {
    return true;
  }

  return false;
};

module.exports = { isValidString, isValidNumber, isEmptyString, isValidArray };
