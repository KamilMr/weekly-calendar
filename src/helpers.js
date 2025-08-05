const generateColorFromNumber = number => {
  const hue = (number * 137.508) % 360;
  return `hsl(${hue}, 70%, 60%)`;
};

const createInitialEvents = num => {
  return Array.from({length: num}, (_, idx) => {
    // Create varied start times throughout the day
    const baseDate = date.addDayToDate(new Date(), idx % 7); // Spread across different days
    // const startHour = 8 + ((idx * 2) % 14); // Hours between 8-22
    const startHour = 8;
    const startMinute = 0;//(idx * 15) % 60; // Minutes: 0, 15, 30, 45
    const durationHours = 1;// + (idx % 3); // Duration: 1, 2, or 3 hours

    const startDate = new Date(baseDate);
    startDate.setHours(startHour, startMinute, 0, 0);

    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + durationHours);

    return {
      id: `event${idx + 1}`,
      backgroundColor: generateColorFromNumber(1),
      startDate: startDate,
      endDate: endDate,
    };
  });
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

const get3CharId = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const existingIds = new Set();
  Object.values(this.overlappedEvents).forEach(columnGroups => {
    Object.keys(columnGroups).forEach(groupId => {
      existingIds.add(groupId);
    });
  });

  let newId;
  do {
    newId = '';
    for (let i = 0; i < 3; i++) {
      newId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (existingIds.has(newId));

  return newId;
};

const calcDOMElem = el => {
  const domEl = el instanceof Element ? el : document.getElementById(el);
  const rect = domEl.getBoundingClientRect();
  return {
    element: domEl,
    left: rect.left,
    bottom: rect.bottom,
    top: rect.top,
    height: rect.height,
    width: rect.width,
  };
};

export {
  calcDOMElem,
  createInitialEvents,
  date as dateUtils,
  generateColorFromNumber,
  get3CharId,
};
