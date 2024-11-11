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

const isValidBoolean = (boolean) => {
  if (typeof boolean !== "boolean") {
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

module.exports = { isValidString, isValidNumber, isValidBoolean, isEmptyString };
