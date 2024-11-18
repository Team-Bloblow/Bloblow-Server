const { PERIOD } = require("../config/constants");

const isToday = (comparedDate) => {
  const today = new Date();

  const isSameYear = today.getFullYear().toString() === comparedDate.substring(0, 4);
  const isSameMonth = (today.getMonth() + 1).toString() === comparedDate.substring(4, 6);
  const isSameDate =
    (today.getDate() < 10 ? "0" + today.getDate() : today.getDate().toString()) ===
    comparedDate.substring(6);

  return isSameYear && isSameMonth && isSameDate;
};

const getCursorIdDate = (period) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cursorIdDate = new Date(today);
  if (period === PERIOD.WEEKLY) {
    cursorIdDate.setDate(cursorIdDate.getDate() - cursorIdDate.getDay() - 1);
  } else if (period === PERIOD.MONTHLY_DAILY) {
    cursorIdDate.setDate(0);
  } else if (period === PERIOD.MONTHLY_WEEKLY) {
    cursorIdDate.setDate(1);
    cursorIdDate.setDate(-cursorIdDate.getDay());
  }

  return cursorIdDate;
};

const getPreviousCursorIdDate = (date, period) => {
  const cursorIdDate = new Date(date);

  if (period === PERIOD.WEEKLY) {
    cursorIdDate.setDate(cursorIdDate.getDate() - 8);
  } else if (period === PERIOD.MONTHLY_DAILY) {
    cursorIdDate.setMonth(cursorIdDate.getMonth() - 1);
    cursorIdDate.setDate(0);
  } else if (period === PERIOD.MONTHLY_WEEKLY) {
    cursorIdDate.setDate(cursorIdDate.getDate() - 1);
    cursorIdDate.setDate(1);
    cursorIdDate.setDate(cursorIdDate.getDate() - cursorIdDate.getDay() - 1);
  }

  return cursorIdDate;
};

const getNextCursorIdDate = (date) => {
  let cursorIdDate = new Date(date);
  cursorIdDate.setHours(0, 0, 0, 0);
  cursorIdDate = new Date(cursorIdDate);

  return cursorIdDate;
};

const getCursorWeek = (cursorIdDate, addDay = 0) => {
  const startDate = new Date(cursorIdDate);
  startDate.setDate(startDate.getDate() + 1 + addDay);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(cursorIdDate);
  endDate.setDate(endDate.getDate() + 7 + addDay);
  endDate.setHours(23, 59, 59, 999);

  return [startDate, endDate];
};

const getCursorPeriod = (cursorIdDate, period, addPeriod = 0) => {
  let startDate = new Date(cursorIdDate);
  let endDate = new Date(cursorIdDate);
  let periodLength = 0;

  switch (period) {
    case PERIOD.WEEKLY:
      startDate.setDate(startDate.getDate() + 1 + addPeriod);

      endDate.setDate(endDate.getDate() + 7 + addPeriod);
      endDate.setHours(23, 59, 59, 999);
      endDate = new Date(endDate);

      periodLength = 7;

      break;

    case PERIOD.MONTHLY_DAILY:
      startDate.setDate(startDate.getDate() + 1);

      endDate.setMonth(startDate.getMonth() + addPeriod + 1);
      endDate.setDate(0);
      endDate.setHours(23, 59, 59, 999);
      endDate = new Date(endDate);

      periodLength = endDate.getDate() - startDate.getDate() + 1;

      break;

    case PERIOD.MONTHLY_WEEKLY:
      if (addPeriod !== 0) {
        startDate.setDate(startDate.getDate() + (6 - startDate.getDay()));
        startDate.setMonth(startDate.getMonth() + addPeriod);
        startDate.setDate(1);
        if (startDate.getDay() > 0) {
          startDate.setDate(-startDate.getDay());
        }
      } else {
        startDate.setDate(startDate.getDate() + 1);

        endDate.setDate(startDate.getDate() + 6);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0);
        if (endDate.getDay() < 6) {
          endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
        }
      }

      endDate.setHours(23, 59, 59, 999);
      endDate = new Date(endDate);

      periodLength = Math.round(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) / 7
      );

      break;
  }

  return [startDate, endDate, periodLength];
};

const getTargetDateString = (date, addDay = 0) => {
  const targetDate = new Date(date);
  targetDate.setDate(targetDate.getDate() + addDay);

  const transformedTargetMonth =
    (targetDate.getMonth() + 1).toString().length === 1
      ? (targetDate.getMonth() + 1).toString().padStart(2, "0")
      : (targetDate.getMonth() + 1).toString();

  const transformedTargetDate =
    targetDate.getDate().toString().length === 1
      ? targetDate.getDate().toString().padStart(2, "0")
      : targetDate.getDate().toString();

  return `${targetDate.getFullYear()}.${transformedTargetMonth}.${transformedTargetDate}`;
};

module.exports = {
  isToday,
  getCursorIdDate,
  getPreviousCursorIdDate,
  getNextCursorIdDate,
  getCursorWeek,
  getCursorPeriod,
  getTargetDateString,
};
