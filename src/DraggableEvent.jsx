import React, {useState, useRef, useEffect} from 'react';
import {COLORS} from './engine';

const DRAG_THRESHOLD = 5;

const DraggableEvent = ({event, columnObserver, columns, onEventMove}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({x: 0, y: 0});
  const [initialPosition, setInitialPosition] = useState({left: 0, top: 0});
  const [dragging, setDragging] = useState({top: 0, left: 0});
  const [hasMoved, setHasMoved] = useState(false);
  const [currentColumn, setCurrentColumn] = useState(null);
  const sourceColumnId = useRef();
  const eventRef = useRef();

  // Function to update React state from engine data
  const updateEventState = eventData => {
    setDragging({
      ...eventData,
      left: eventData.left + 'px',
      top: eventData.top + 'px',
      width: eventData.width + 'px',
      height: eventData.height + 'px',
    });
    setInitialPosition({
      left: eventData.left,
      top: eventData.top,
    });
  };

  useEffect(() => {
    if (!columnObserver) return;

    // Register the React state update function
    columnObserver.registerEventUpdateFunction(event.id, updateEventState);

    columnObserver.registerEvent(event, layout => {
      //TODO: update only one column instead
      columnObserver.updateAllColumns();
    });

    // Cleanup function to unregister on unmount
    return () => {
      columnObserver.unregisterEventUpdateFunction(event.id);
    };
  }, [columnObserver]);

  const detectHoveredColumn = element => {
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

  const handleMouseDown = e => {
    e.preventDefault();
    setIsDragging(true);
    setHasMoved(false);
    setDragStart({x: e.clientX, y: e.clientY});
    setInitialPosition({
      left: eventRef.current.offsetLeft,
      top: eventRef.current.offsetTop,
    });
  };

  const getHour = date => date?.toTimeString().split(' ')[0]

  const handleMouseMove = e => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (totalMovement > DRAG_THRESHOLD) setHasMoved(true);

    const hoveredColumn = detectHoveredColumn(eventRef.current);
    if (hoveredColumn) setCurrentColumn(hoveredColumn);
    if (!sourceColumnId.current && hoveredColumn)
      sourceColumnId.current = hoveredColumn.id;

    columnObserver.updateEvent(
      event.id,
      {
        left: initialPosition.left + deltaX,
        top: initialPosition.top + deltaY,
        currentColumnId: hoveredColumn?.id,
      },
      ({left, top, width, startDate, endDate}) => {
        setDragging({
          ...dragging,
          left,
          top,
          ...(width && {width}),
          ...(startDate && {startDate}),
          ...(endDate && {endDate}),
        });
      },
    );

    columns.forEach(column => {
      column.style.backgroundColor =
        column === hoveredColumn ? COLORS.HOVER_BLUE : COLORS.DEFAULT;
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);

    if (currentColumn && hasMoved && columnObserver) {
      columnObserver.calibrateEvent(
        event.id,
        sourceColumnId.current !== currentColumn ? sourceColumnId.current : null,
      );
    } else if (!hasMoved) {
      setDragging({
        ...dragging,
        left: initialPosition.left + 'px',
        top: initialPosition.top + 'px',
      });
    }

    columns.forEach(column => {
      column.style.backgroundColor = COLORS.DEFAULT;
    });
    sourceColumnId.current = null;
    setCurrentColumn(null);
  };

  return (
    <div
      ref={eventRef}
      id={event.id}
      className="event"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{
        height: `${event.height}px`,
        backgroundColor: event.backgroundColor,
        width: event.width,
        cursor: isDragging ? 'grabbing' : 'grab',
        ...dragging,
        zIndex: isDragging ? 1000 : 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseDown={handleMouseDown}
    >
      <span style={{fontSize: '0.75em'}}>{getHour(dragging.startDate)}</span>
      <span style={{fontSize: '0.75em'}}>{getHour(dragging.endDate)}</span>
    </div>
  );
};

export default DraggableEvent;
