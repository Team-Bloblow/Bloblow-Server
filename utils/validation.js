const isValidatedString = (string) => {
  if (
    string === null ||
    string === undefined ||
    typeof string === "undefined" ||
    Array.isArray(string) ||
    typeof string === "object"
  ) {
    return false;
  }

  return true;
};

const isValidatedNumber = (number) => {
  if (
    number === null ||
    number === undefined ||
    typeof number === "undefined" ||
    isNaN(number) ||
    typeof number === "object"
  ) {
    return false;
  }

  return true;
};

module.exports = { isValidatedString, isValidatedNumber };
