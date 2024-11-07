const isValidString = (string) => {
  if (string === null || string === undefined || typeof string !== "string") {
    return false;
  }

  return true;
};

const isValidNumber = (number) => {
  if (number === null || number === undefined || typeof number !== "number") {
    return false;
  }

  return true;
};

const isBlank = (string) => {
  if (string === "" || string.trim() === "") {
    return true;
  }

  return false;
};

module.exports = { isValidString, isValidNumber, isBlank };
