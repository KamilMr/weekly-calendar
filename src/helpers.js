import {
  DEFAULT_START_HOUR,
  DEFAULT_START_MINUTE,
  DEFAULT_DURATION_HOURS,
  HOUR_LABEL_WIDTH,
  COLUMN_WIDTH,
} from './const';

const generateColorFromNumber = number => {
  const hue = (number * 137.508) % 360;
  return `hsl(${hue}, 70%, 60%)`;
};

const createInitialEvents = num => {
  return Array.from({length: num}, (_, idx) => {
    // Create varied start times throughout the day
    const baseDate = date.addDayToDate(new Date(), idx % 7); // Spread across different days
    // const startHour = 8 + ((idx * 2) % 14); // Hours between 8-22
    const startHour = DEFAULT_START_HOUR;
    const startMinute = DEFAULT_START_MINUTE; //(idx * 15) % 60; // Minutes: 0, 15, 30, 45
    const durationHours = DEFAULT_DURATION_HOURS; // + (idx % 3); // Duration: 1, 2, or 3 hours

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

date.getStartOfWeek = (startDay = 1) => {
  const today = new Date();
  const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Calculate days to subtract to get to the start day
  let daysToSubtract = (currentDay - startDay + 7) % 7;

  // If today is the start day, don't subtract anything
  if (daysToSubtract === 0 && currentDay !== startDay) daysToSubtract = 7;

  const startOfWeek = new Date();
  startOfWeek.setDate(today.getDate() - daysToSubtract);
  return startOfWeek;
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

const snapToNearestMinutes = (minutes, snapInterval = 5) => {
  return Math.round(minutes / snapInterval) * snapInterval;
};

const detectHoveredColumn = (element, columns) => {
  const draggedRect = element.getBoundingClientRect();
  const draggedCenterX = draggedRect.left + draggedRect.width / 2;

  for (let column of columns) {
    const boxRect = column.getBoundingClientRect();
    if (draggedCenterX >= boxRect.left && draggedCenterX <= boxRect.right) {
      const draggedTop = draggedRect.top;
      const draggedBottom = draggedRect.bottom;
      const columnTop = boxRect.top;
      const columnBottom = boxRect.bottom;
      if (draggedTop >= columnTop && draggedBottom <= columnBottom) {
        return column;
      }
    }
  }
  return null;
};

const detectBorderZone = (e, eventRef, resizeZoneHeight) => {
  if (!eventRef.current) return null;

  const rect = eventRef.current.getBoundingClientRect();
  const mouseY = e.clientY - rect.top;

  if (mouseY <= resizeZoneHeight) return 'top';
  else if (mouseY >= rect.height - resizeZoneHeight) return 'bottom';
  return null;
};

const getHour = date =>
  date?.toTimeString().split(' ')[0].split(':').slice(0, 2).join(':');

// Responsive column width calculation
const getResponsiveColumnWidth = (screenWidth, cols) => {
  if (screenWidth <= 480) {
    return Math.max(80, (screenWidth - HOUR_LABEL_WIDTH) / cols);
  } else if (screenWidth <= 768) {
    return Math.max(90, (screenWidth - HOUR_LABEL_WIDTH) / cols);
  }
  return COLUMN_WIDTH;
};

const generateDatesForCalendar = (startDay, numOfDays, addSub) => {
  if (typeof startDay !== 'number' || startDay < 0 || startDay > 6) {
    throw new Error(
      'startDay must be a number between 0 (Sunday) and 6 (Saturday)',
    );
  }
  if (typeof numOfDays !== 'number' || numOfDays <= 0) {
    throw new Error('numOfDays must be a positive number');
  }
  if (typeof addSub !== 'number') {
    throw new Error('addSub must be a number');
  }

  const today = new Date();
  const currentDay = today.getDay();

  let daysToSubtract = (currentDay - startDay + 7) % 7;
  daysToSubtract += addSub * -1 * 7;

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - daysToSubtract);

  const dates = [];
  for (let i = 0; i < numOfDays; i++) {
    const currentDate = new Date(startOfWeek);
    currentDate.setDate(startOfWeek.getDate() + i);
    dates.push(date.getYYYMMDD(currentDate));
  }

  return dates;
};

export {
  calcDOMElem,
  createInitialEvents,
  date as dateUtils,
  detectBorderZone,
  detectHoveredColumn,
  generateColorFromNumber,
  generateDatesForCalendar,
  get3CharId,
  getHour,
  getResponsiveColumnWidth,
  snapToNearestMinutes,
};
