import React, {useState, useRef, useEffect, useCallback} from 'react';
import {COLORS} from './engine';
import {detectBorderZone, detectHoveredColumn, getHour} from './helpers.js';

const DRAG_THRESHOLD = 5;
const RESIZE_ZONE_HEIGHT = 8;

const DraggableEvent = ({event, columnObserver, columns, onEventMove}) => {
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



  const handleEventMouseMove = (e) => {
    if (isDragging || isResizing) return;
    
    const borderZone = detectBorderZone(e, eventRef, RESIZE_ZONE_HEIGHT);
    if (borderZone === 'top' || borderZone === 'bottom') setCursorType('ns-resize');
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
  const handleMouseMove = useCallback(e => {
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
        if (resizeMode === 'top') newTop = initialPosition.top + (initialHeight - minHeight);
        newHeight = minHeight;
      }
      
      // Update the event through the engine which handles time calculations and snapping
      if (resizeMode === 'top') {
        // Update top position, engine recalculates start time and snaps to time grid
        columnObserver.updateEventTop(event.id, newTop, (updatedEvent) => {
          setDraggingEvent({
            ...draggingEvent,
            top: updatedEvent.top + 'px',
            height: updatedEvent.height + 'px',
            ...(updatedEvent.startDate && {startDate: updatedEvent.startDate}),
            ...(updatedEvent.endDate && {endDate: updatedEvent.endDate}),
          });
        });
      } else if (resizeMode === 'bottom') {
        // Update bottom position, engine recalculates end time and snaps to time grid
        const newBottom = initialPosition.top + initialHeight + deltaY;
        columnObserver.updateEventBottom(event.id, newBottom, (updatedEvent) => {
          setDraggingEvent({
            ...draggingEvent,
            height: updatedEvent.height + 'px',
            ...(updatedEvent.startDate && {startDate: updatedEvent.startDate}),
            ...(updatedEvent.endDate && {endDate: updatedEvent.endDate}),
          });
        });
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
      columns.forEach(column => {
        column.style.backgroundColor =
          column === hoveredColumn ? COLORS.HOVER_BLUE : COLORS.DEFAULT;
      });
    }
  }, [
      isDragging, isResizing, resizeMode, dragStart.x, dragStart.y, initialPosition.left, initialPosition.top, initialHeight, draggingEvent, columnObserver, event.id, columns]);

  // TODO: Add comments explaining logic to this function 
  const handleMouseUp = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      setResizeMode(null);
      
      if (hasMoved && columnObserver) {
        // Calibrate the resized event to snap to proper time boundaries
        columnObserver.calibrateEvent(event.id, null);
      }
    } else if (isDragging) {
      setIsDragging(false);

      if (currentColumn && hasMoved && columnObserver) {
        columnObserver.calibrateEvent(
          event.id,
          sourceColumnId.current !== currentColumn ? sourceColumnId.current : null,
        );
      } else if (!hasMoved) {
        setDraggingEvent({
          ...draggingEvent,
          left: initialPosition.left + 'px',
          top: initialPosition.top + 'px',
        });
      }

      columns.forEach(column => {
        column.style.backgroundColor = COLORS.DEFAULT;
      });
      sourceColumnId.current = null;
      setCurrentColumn(null);
    }
  }, [isResizing, isDragging, currentColumn, hasMoved, columnObserver, event.id, draggingEvent, initialPosition.left, initialPosition.top, columns]);

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
      }}
      onMouseDown={handleMouseDown}
    >
      <span style={{fontSize: '0.75em'}}>{getHour(draggingEvent.startDate)}</span>
      <span style={{fontSize: '0.75em'}}>{getHour(draggingEvent.endDate)}</span>
    </div>
  );
};

export default DraggableEvent;
