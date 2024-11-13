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

const validateAdKeyword = [
  "소정의 원고료",
  "소정의 수수료",
  "수수료를 지급받아",
  "원고료를 지급받아",
];

module.exports = { isValidString, isValidNumber, isValidBoolean, isEmptyString, validateAdKeyword };
