const isToday = (comparedDate) => {
  const today = new Date();

  const isSameYear = today.getFullYear().toString() === comparedDate.substring(0, 4);
  const isSameMonth = (today.getMonth() + 1).toString() === comparedDate.substring(4, 6);
  const isSameDate =
    (today.getDate() < 10 ? "0" + today.getDate() : today.getDate().toString()) ===
    comparedDate.substring(6);

  return isSameYear && isSameMonth && isSameDate;
};

const getCursorWeek = (cursorId, addDay) => {
  const startDate = new Date(cursorId);
  startDate.setDate(startDate.getDate() + addDay);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(cursorId);
  endDate.setDate(endDate.getDate() + 6 + addDay);
  endDate.setHours(23, 59, 59, 999);

  return [startDate, endDate];
};

module.exports = { isToday, getCursorWeek };
