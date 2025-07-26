import React, {useEffect, useRef, useState} from 'react';

import {ColumnObserver, COLORS} from './engine';
import {createInitialEvents, dateUtils} from './helpers';
import DraggableEvent from './DraggableEvent';

import './styles.css';

const NUM_OF_COL = 7;
const NUM_OF_EVENTS = 5;

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

    // Add each event to the matching column based on its date
    events.forEach((event, idx) => {
      const eventElement = document.getElementById(event.id);
      const eventDateString = dateUtils.getYYYMMDD(event.date);
      const targetColumnId = `column_${eventDateString}`;
      const targetColumn = document.getElementById(targetColumnId);

      if (eventElement && targetColumn) {
        // Add event to matching column based on date
        columnObserverRef.current.addEventToColumn(
          eventElement,
          targetColumnId,
        );
      }
    });

    // Refresh layout to position events properly
    refreshLayout();
  }, [columns, events]);

  // Apply layout calculations to DOM elements
  const applyLayoutToDOM = layoutResults => {
    Object.entries(layoutResults).forEach(([eventId, layout]) => {
      const element = document.getElementById(eventId);
      if (element) {
        element.style.width = layout.width + 'px';
        element.style.left = layout.left + 'px';

        // Update initial positions for drag functionality
        if (element._dragUpdateInitialPositions) {
          element._dragUpdateInitialPositions();
        }
      }
    });
  };

  // Refresh layout and apply to DOM
  const refreshLayout = () => {
    if (!columnObserverRef.current || columns.length === 0) return;

    // Get column dimensions
    const columnWidths = {};
    const columnOffsets = {};
    columns.forEach(column => {
      if (column) {
        const rect = column.getBoundingClientRect();
        columnWidths[column.id] = rect.width;
        columnOffsets[column.id] = column.offsetLeft;
      }
    });

    // Calculate layout using engine
    const layoutResults = columnObserverRef.current.calculateLayout(
      undefined, // use default column IDs
      columnWidths,
      columnOffsets,
    );

    // Apply to DOM
    applyLayoutToDOM(layoutResults);
  };

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
        refreshLayout();
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
                textAlign: 'right',
                paddingRight: 2,
                fontWeight: 'bold',
                width: '130px',
                height: '30px',
                borderBottom: 'none',
              }}
            >
              {dateUtils.getDay(dateUtils.addDayToDate(new Date(), idx))}
            </div>
          ))}
        </div>

        {/* Calendar Columns */}
        <div className="container" style={{position: 'relative'}}>
          {Array.from({length: NUM_OF_COL}).map((_, idx) => (
            <div
              key={`column${idx + 1}`}
              id={`column_${dateUtils.getYYYMMDD(dateUtils.addDayToDate(new Date(), idx))}`}
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
              onEventMove={refreshLayout}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;
