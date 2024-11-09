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

const isBlank = (string) => {
  if (string.trim() === "") {
    return true;
  }

  return false;
};

module.exports = { isValidString, isValidNumber, isBlank };
