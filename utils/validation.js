const isValidString = (string) => {
  if (
    string === null ||
    string === undefined ||
    string.trim() === "" ||
    typeof string !== "string"
  ) {
    return false;
  }

  return true;
};

const isValidNumber = (number) => {
  if (number === null || number === undefined || typeof number === "number") {
    return false;
  }

  return true;
};

module.exports = { isValidString, isValidNumber };
