const createDiv = ({className = '', styles = {}, id}) => {
  const div = createElement({tag: 'div', className, styles, id});
  return div;
};

const appendElement = (parent, child) => {
  parent.appendChild(child);
  return child;
};

const removeElement = (element) => {
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
  }
  return element;
};

const createElement = ({tag, className = '', styles = {}, id}) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (id) element.id = id;
  Object.assign(element.style, styles);
  return element;
};

export {createElement, createDiv, removeElement, appendElement};
