const generateColorFromNumber = number => {
  const hue = (number * 137.508) % 360;
  return `hsl(${hue}, 70%, 60%)`;
};

const createInitialEvents = num => {
  return Array.from({length: num}, (_, idx) => ({
    id: `event${idx + 1}`,
    height: (idx + 2) * 20,
    width: 130,
    top: idx * 10,
    backgroundColor: generateColorFromNumber(idx),
    date: date.addDayToDate(new Date(), idx)
  }));
};

const date = {};

date.addDayToDate = (date, num) => {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + num);
  return newDate;
};

date.subDayFromDate = (date, sub) => {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() - sub);
  return newDate;
};

date.getDayName = (newDate, version = 'short') => {
  return newDate.toLocaleDateString('pl-PL', {weekday: version});
};

date.getMonth = (newDate, version = 'short') => {
  return newDate.toLocaleDateString('pl-PL', {month: version});
};

date.createNumbOfDays = num => {
  const tR = [];
  const today = new Date();

  for (let i = 0; i < num; i++) {
    const newDate = date.addDayToDate(today, i);
    tR.push({
      date: newDate,
      dayName: date.getDayName(newDate),
      dayNumber: newDate.getDate(),
      month: date.getMonth(newDate),
    });
  }
  return tR;
};

date.getDay = newDate => {
  return `${date.getDayName(newDate)} ${newDate.getDate()}`;
};

date.getYYYMMDD = (newDate = new Date()) => {
  return newDate.toISOString().split('T')[0];
};

export {generateColorFromNumber, createInitialEvents, date as dateUtils};
