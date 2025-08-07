import React, {useState, useRef, useEffect, useCallback} from 'react';
import {COLORS} from './engine';
import {detectBorderZone, detectHoveredColumn, getHour} from './helpers.js';

const DRAG_THRESHOLD = 5;
const RESIZE_ZONE_HEIGHT = 8;

const DraggableEvent = ({
  event,
  columnObserver,
  columns,
  onEventMove,
  title = 'Event',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeMode, setResizeMode] = useState(null); // 'top' or 'bottom'
  const [dragStart, setDragStart] = useState({x: 0, y: 0});
  const [initialPosition, setInitialPosition] = useState({left: 0, top: 0});
  const [initialHeight, setInitialHeight] = useState(0);
  const [draggingEvent, setDraggingEvent] = useState({top: 0, left: 0});
  const [hasMoved, setHasMoved] = useState(false);
  const [currentColumn, setCurrentColumn] = useState(null);
  const [cursorType, setCursorType] = useState('grab');
  const sourceColumnId = useRef();
  const eventRef = useRef();

  // Function to update React state from engine data
  const updateEventState = eventData => {
    setDraggingEvent({
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

  const handleEventMouseMove = e => {
    if (isDragging || isResizing) return;

    const borderZone = detectBorderZone(e, eventRef, RESIZE_ZONE_HEIGHT);
    if (borderZone === 'top' || borderZone === 'bottom')
      setCursorType('ns-resize');
    else setCursorType('grab');
  };

  const handleMouseDown = e => {
    e.preventDefault();

    const borderZone = detectBorderZone(e, eventRef, RESIZE_ZONE_HEIGHT);
    if (borderZone) {
      setIsResizing(true);
      setResizeMode(borderZone);
      setInitialHeight(eventRef.current.offsetHeight);
    } else setIsDragging(true);

    setHasMoved(false);
    setDragStart({x: e.clientX, y: e.clientY});
    setInitialPosition({
      left: eventRef.current.offsetLeft,
      top: eventRef.current.offsetTop,
    });
  };

  /**
   * Handles mouse movement during drag and resize operations
   * This function is called continuously while the user moves the mouse after initiating a drag or resize
   */
  const handleMouseMove = useCallback(
    e => {
      // Exit early if not in an active drag or resize operation
      if (!isDragging && !isResizing) return;

      // Calculate movement deltas from the initial mouse down position
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Mark as moved once threshold is exceeded to distinguish from clicks
      if (totalMovement > DRAG_THRESHOLD) setHasMoved(true);

      if (isResizing) {
        // RESIZE MODE: Adjust event height and position based on resize direction
        let newTop = initialPosition.top;
        let newHeight = initialHeight;

        if (resizeMode === 'top') {
          // Resizing from top edge: move top position and adjust height inversely
          newTop = initialPosition.top + deltaY;
          newHeight = initialHeight - deltaY;
        } else if (resizeMode === 'bottom') {
          // Resizing from bottom edge: keep top fixed, only change height
          newHeight = initialHeight + deltaY;
        }

        // Enforce minimum height constraint to prevent events from becoming too small
        const minHeight = 20;
        if (newHeight < minHeight) {
          if (resizeMode === 'top')
            newTop = initialPosition.top + (initialHeight - minHeight);
          newHeight = minHeight;
        }

        // Update the event through the engine which handles time calculations and snapping
        if (resizeMode === 'top') {
          // Update top position, engine recalculates start time and snaps to time grid
          columnObserver.updateEventTop(event.id, newTop, updatedEvent => {
            setDraggingEvent({
              ...draggingEvent,
              top: updatedEvent.top + 'px',
              height: updatedEvent.height + 'px',
              ...(updatedEvent.startDate && {
                startDate: updatedEvent.startDate,
              }),
              ...(updatedEvent.endDate && {endDate: updatedEvent.endDate}),
            });
          });
        } else if (resizeMode === 'bottom') {
          // Update bottom position, engine recalculates end time and snaps to time grid
          const newBottom = initialPosition.top + initialHeight + deltaY;
          columnObserver.updateEventBottom(
            event.id,
            newBottom,
            updatedEvent => {
              setDraggingEvent({
                ...draggingEvent,
                height: updatedEvent.height + 'px',
                ...(updatedEvent.startDate && {
                  startDate: updatedEvent.startDate,
                }),
                ...(updatedEvent.endDate && {endDate: updatedEvent.endDate}),
              });
            },
          );
        }
      } else if (isDragging) {
        // DRAG MODE: Move event position and handle column changes

        // Detect which column the event is currently over
        const hoveredColumn = detectHoveredColumn(eventRef.current, columns);
        if (hoveredColumn) setCurrentColumn(hoveredColumn);

        // Track the original source column for cleanup operations
        if (!sourceColumnId.current && hoveredColumn)
          sourceColumnId.current = hoveredColumn.id;

        // Update event position through engine, which handles time/date calculations
        columnObserver.updateEvent(
          event.id,
          {
            left: initialPosition.left + deltaX,
            top: initialPosition.top + deltaY,
            currentColumnId: hoveredColumn?.id,
          },
          ({left, top, width, startDate, endDate}) => {
            // Update React state with engine-calculated values
            setDraggingEvent({
              ...draggingEvent,
              left,
              top,
              ...(width && {width}),
              ...(startDate && {startDate}),
              ...(endDate && {endDate}),
            });
          },
        );

        // Provide visual feedback by highlighting the hovered column
        // columns.forEach(column => {
        //   column.style.backgroundColor =
        //     column === hoveredColumn ? COLORS.HOVER_BLUE : COLORS.DEFAULT;
        // });
      }
    },
    [
      isDragging,
      isResizing,
      resizeMode,
      dragStart.x,
      dragStart.y,
      initialPosition.left,
      initialPosition.top,
      initialHeight,
      draggingEvent,
      columnObserver,
      event.id,
      columns,
    ],
  );

  /**
   * Handles mouse up events to finalize drag/resize operations
   * Called when user releases mouse button, completing the interaction
   */
  const handleMouseUp = useCallback(() => {
    if (isResizing) {
      // RESIZE COMPLETION: Clean up resize state and finalize position
      setIsResizing(false);
      setResizeMode(null);

      if (hasMoved && columnObserver) {
        // Calibrate the resized event to snap to proper time boundaries
        // No source column needed since resize happens within same column
        columnObserver.calibrateEvent(event.id, null);
      }
    } else if (isDragging) {
      // DRAG COMPLETION: Clean up drag state and finalize position
      setIsDragging(false);

      if (currentColumn && hasMoved && columnObserver) {
        // Calibrate event position and handle column changes
        // Pass source column if event moved to a different column for cleanup
        columnObserver.calibrateEvent(
          event.id,
          sourceColumnId.current !== currentColumn
            ? sourceColumnId.current
            : null,
        );
      } else if (!hasMoved) {
        // If no actual movement occurred, reset to original position (was just a click)
        setDraggingEvent({
          ...draggingEvent,
          left: initialPosition.left + 'px',
          top: initialPosition.top + 'px',
        });
      }

      // Remove visual feedback from all columns
      columns.forEach(column => {
        column.style.backgroundColor = COLORS.DEFAULT;
      });

      // Reset drag tracking state
      sourceColumnId.current = null;
      setCurrentColumn(null);
    }
  }, [
    isResizing,
    isDragging,
    currentColumn,
    hasMoved,
    columnObserver,
    event.id,
    draggingEvent,
    initialPosition.left,
    initialPosition.top,
    columns,
  ]);

  // Handle document-level mouse events during drag/resize to prevent losing grip
  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  const isLessThen30 = parseInt(draggingEvent.height) < 30;

  return (
    <div
      ref={eventRef}
      id={event.id}
      className="event"
      onMouseMove={handleEventMouseMove}
      style={{
        height: `${event.height}px`,
        backgroundColor: event.backgroundColor,
        width: event.width,
        cursor: isDragging ? 'grabbing' : isResizing ? 'ns-resize' : cursorType,
        ...draggingEvent,
        zIndex: isDragging ? 1000 : 'auto',
        display: 'flex',
        flexDirection: 'column',
        padding: '4px 6px',
        borderRadius: '4px',
        border: '1px solid rgba(0, 0, 0, 0.5)',
        boxShadow: isDragging
          ? '0 4px 12px rgba(0, 0, 0, 0.15)'
          : '0 1px 3px rgba(0, 0, 0, 0.1)',
        fontSize: '12px',
        fontWeight: '500',
        color: '#333333',
        textShadow: 'none',
        overflow: 'hidden',
        userSelect: 'none',
        transition: isDragging || isResizing ? 'none' : 'box-shadow 0.2s ease',
      }}
      onMouseDown={handleMouseDown}
    >
      <div
        style={{
          fontSize: isLessThen30 ? '11px' : '12px',
          fontWeight: '500',
          opacity: 0.95,
          lineHeight: '1.2',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {isLessThen30 ? (
          getHour(draggingEvent.startDate) + ' ' + title
        ) : (
          <>
            <div>{`${getHour(draggingEvent.startDate)} - ${getHour(draggingEvent.endDate)} `}</div>
            <div>{title}</div>
          </>
        )}
      </div>
    </div>
  );
};

export default DraggableEvent;
