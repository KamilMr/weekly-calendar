import React, {useState, useRef, useEffect} from 'react';
import {COLORS} from './engine';

const DRAG_THRESHOLD = 5;

const DraggableEvent = ({event, columnObserver, columns, onEventMove}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({x: 0, y: 0});
  const [initialPosition, setInitialPosition] = useState({left: 0, top: 0});
  const [hasMoved, setHasMoved] = useState(false);
  const [currentColumn, setCurrentColumn] = useState(null);
  const eventRef = useRef();

  // Function to update initial positions (equivalent to _dragUpdateInitialPositions)
  const updateInitialPositions = () => {
    if (eventRef.current) {
      setInitialPosition({
        left: eventRef.current.offsetLeft,
        top: eventRef.current.offsetTop,
      });
    }
  };

  useEffect(() => {
    updateInitialPositions();
  }, []);

  // Expose the update function on the DOM element for ColumnObserver compatibility
  useEffect(() => {
    if (eventRef.current) {
      eventRef.current._dragUpdateInitialPositions = updateInitialPositions;
    }
  });

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

  const handleMouseMove = e => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (totalMovement > DRAG_THRESHOLD) {
      setHasMoved(true);
    }

    if (hasMoved) {
      eventRef.current.style.left = initialPosition.left + deltaX + 'px';
      eventRef.current.style.top = initialPosition.top + deltaY + 'px';
    }

    const hoveredColumn = detectHoveredColumn(eventRef.current);
    setCurrentColumn(hoveredColumn);

    columns.forEach(column => {
      column.style.backgroundColor =
        column === hoveredColumn ? COLORS.HOVER_BLUE : COLORS.DEFAULT;
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);

    if (currentColumn && hasMoved && columnObserver) {
      const columnCameFrom = columnObserver.getColIdEvIsLoc(event.id);
      columnObserver.addEventToColumn(eventRef.current, currentColumn.id);

      // Trigger layout recalculation in parent component
      if (onEventMove) {
        onEventMove();
      }

      setInitialPosition({
        left: eventRef.current.offsetLeft,
        top: eventRef.current.offsetTop,
      });
    } else if (!hasMoved) {
      eventRef.current.style.left = initialPosition.left + 'px';
      eventRef.current.style.top = initialPosition.top + 'px';
    }

    columns.forEach(column => {
      column.style.backgroundColor = COLORS.DEFAULT;
    });
    setCurrentColumn(null);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart, initialPosition, hasMoved, currentColumn]);

  return (
    <div
      ref={eventRef}
      id={event.id}
      className="event"
      style={{
        height: `${event.height}px`,
        backgroundColor: event.backgroundColor,
        width: event.width,
        cursor: isDragging ? 'grabbing' : 'grab',
        top: event.top,
        zIndex: isDragging ? 1000 : 'auto',
      }}
      onMouseDown={handleMouseDown}
    >
      {event.id}
    </div>
  );
};

export default DraggableEvent;

