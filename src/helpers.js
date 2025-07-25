const generateColorFromNumber = (number) => {
  const hue = (number * 137.508) % 360;
  return `hsl(${hue}, 70%, 60%)`;
};

export {generateColorFromNumber};
