import React, {useEffect, useRef, useState} from 'react';
import {ColumnObserver, generateColorFromNumber, COLORS} from './engine';

import './styles.css';

const NUM_OF_COL = 7;
const NUM_OF_EVENTS = 5;
const DRAG_THRESHOLD = 5;

function DraggableEvent({event, columnObserver, columns, onEventMove}) {
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

  // Handle window resize - equivalent to the original handleWindowResize functionality
  useEffect(() => {
    const handleWindowResize = () => {
      if (eventRef.current && columnObserver && columns.length > 0) {
        // Find which column the element is currently in
        const currentColumn = detectHoveredColumn(eventRef.current);
        if (currentColumn) {
          // Reposition and resize the element to fit the column
          columnObserver.centerDraggedElementInColumn(
            currentColumn,
            eventRef.current,
          );
          columnObserver.fitElementToColumn(eventRef.current, currentColumn);
        } else {
          // If not in any column, default to first column
          columnObserver.centerDraggedElementInColumn(
            columns[0],
            eventRef.current,
          );
          columnObserver.fitElementToColumn(eventRef.current, columns[0]);
        }

        // Update the initial positions for this element
        updateInitialPositions();
      }
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [columnObserver, columns]);

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
      const toUpdate = [currentColumn.id];
      if (currentColumn.id !== columnCameFrom) toUpdate.push(columnCameFrom);
      columnObserver.refreshLayout(toUpdate);

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
      }}
      onMouseDown={handleMouseDown}
    ></div>
  );
}

const createInitialEvents = num => {
  return Array.from({length: num}, (_, idx) => ({
    id: `event${idx + 1}`,
    height: (idx + 2) * 20,
    width: 130,
    backgroundColor: generateColorFromNumber(idx),
  }));
};

const App = () => {
  const [events, setEvents] = useState(createInitialEvents(NUM_OF_EVENTS));
  const [columns, setColumns] = useState([]);
  const columnObserverRef = useRef();
  const columnRefs = useRef([]);

  // Initialize ColumnObserver and columns
  useEffect(() => {
    if (columnRefs.current.length !== NUM_OF_COL) return;
    if (columnObserverRef.current) return;

    columnObserverRef.current = new ColumnObserver();
    columnObserverRef.current.initializeColumns(columnRefs.current);

    setColumns(columnRefs.current);
  }, []);

  // Initialize events in columns after both ColumnObserver and DOM elements are ready
  useEffect(() => {
    if (!columnObserverRef.current || columns.length === 0) return;

    // Add each event to the first column initially and position them
    events.forEach((event, idx) => {
      const eventElement = document.getElementById(event.id);
      if (eventElement && columnRefs.current[0]) {
        // Add event to first column
        columnObserverRef.current.addEventToColumn(
          eventElement,
          columnRefs.current[0].id,
        );
      }
    });

    // Refresh layout to position events properly
    columnObserverRef.current.refreshLayout();
  }, [columns, events]);

  // Add column hover listeners
  useEffect(() => {
    columns.forEach(column => {
      if (column) {
        const handleMouseEnter = () => {
          column.style.backgroundColor = COLORS.HOVER_BLUE;
          column.style.color = COLORS.DEFAULT;
        };

        const handleMouseLeave = () => {
          column.style.backgroundColor = COLORS.DEFAULT;
          column.style.color = COLORS.DEFAULT;
        };

        column.addEventListener('mouseenter', handleMouseEnter);
        column.addEventListener('mouseleave', handleMouseLeave);

        return () => {
          column.removeEventListener('mouseenter', handleMouseEnter);
          column.removeEventListener('mouseleave', handleMouseLeave);
        };
      }
    });
  }, [columns]);

  // Global window resize handler to refresh layout after all events are processed
  useEffect(() => {
    const handleGlobalResize = () => {
      // Small delay to ensure all individual event resize handlers have completed
      setTimeout(() => {
        if (columnObserverRef.current) {
          columnObserverRef.current.refreshLayout();
        }
      }, 0);
    };

    window.addEventListener('resize', handleGlobalResize);
    return () => window.removeEventListener('resize', handleGlobalResize);
  }, []);

  return (
    <div className="container">
      <div
        className="container"
        style={{display: 'flex', flexDirection: 'column'}}
      >
        {/* Day Headers */}
        <div style={{display: 'flex'}}>
          {Array.from({length: NUM_OF_COL}).map((_, idx) => (
            <div
              key={`header${idx + 1}`}
              id={`header${idx + 1}`}
              className="box"
              style={{
                textAlign: 'center',
                fontWeight: 'bold',
                width: '130px',
                height: '60px',
              }}
            >
              Day {idx + 1}
            </div>
          ))}
        </div>

        {/* Calendar Columns */}
        <div className="container" style={{position: 'relative'}}>
          {Array.from({length: NUM_OF_COL}).map((_, idx) => (
            <div
              key={`column${idx + 1}`}
              id={`column${idx + 1}`}
              className={`box box${idx + 1}`}
              ref={el => (columnRefs.current[idx] = el)}
            />
          ))}

          {/* Events */}
          {events.map(event => (
            <DraggableEvent
              key={event.id}
              event={event}
              columnObserver={columnObserverRef.current}
              columns={columns}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;
