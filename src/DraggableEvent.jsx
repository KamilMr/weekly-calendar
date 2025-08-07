import React, {useState, useRef, useEffect, useCallback} from 'react';
import {COLORS} from './engine';

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

  const detectBorderZone = (e) => {
    if (!eventRef.current) return null;
    
    const rect = eventRef.current.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    
    if (mouseY <= RESIZE_ZONE_HEIGHT) return 'top';
    else if (mouseY >= rect.height - RESIZE_ZONE_HEIGHT) return 'bottom';
    return null;
  };

  const handleEventMouseMove = (e) => {
    if (isDragging || isResizing) return;
    
    const borderZone = detectBorderZone(e);
    if (borderZone === 'top' || borderZone === 'bottom') setCursorType('ns-resize');
    else setCursorType('grab');
  };

  const handleMouseDown = e => {
    e.preventDefault();
    
    const borderZone = detectBorderZone(e);
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

  const getHour = date => date?.toTimeString().split(' ')[0]

  const handleMouseMove = useCallback(e => {
    if (!isDragging && !isResizing) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (totalMovement > DRAG_THRESHOLD) setHasMoved(true);

    if (isResizing) {
      // Handle resizing
      let newTop = initialPosition.top;
      let newHeight = initialHeight;
      
      if (resizeMode === 'top') {
        // Resize from top: change both position and height
        newTop = initialPosition.top + deltaY;
        newHeight = initialHeight - deltaY;
      } else if (resizeMode === 'bottom') newHeight = initialHeight + deltaY;
      
      // Minimum height constraint
      const minHeight = 20;
      if (newHeight < minHeight) {
        if (resizeMode === 'top') newTop = initialPosition.top + (initialHeight - minHeight);
        newHeight = minHeight;
      }
      
      // Update the event in the engine 
      if (resizeMode === 'top') {
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

      // Here goes dragging 
    } else if (isDragging) {
      // Handle dragging
      const hoveredColumn = detectHoveredColumn(eventRef.current);
      if (hoveredColumn) setCurrentColumn(hoveredColumn);
      if (!sourceColumnId.current && hoveredColumn)
        sourceColumnId.current = hoveredColumn.id;

      // updating event 
      columnObserver.updateEvent(
        event.id,
        {
          left: initialPosition.left + deltaX,
          top: initialPosition.top + deltaY,
          currentColumnId: hoveredColumn?.id,
        },
        ({left, top, width, startDate, endDate}) => {
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

      columns.forEach(column => {
        column.style.backgroundColor =
          column === hoveredColumn ? COLORS.HOVER_BLUE : COLORS.DEFAULT;
      });
    }
  }, [
      isDragging, isResizing, resizeMode, dragStart.x, dragStart.y, initialPosition.left, initialPosition.top, initialHeight, draggingEvent, columnObserver, event.id, columns]);

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
