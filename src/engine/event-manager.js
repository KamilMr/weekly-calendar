/**
 * Overlapping Event Manager (OEM)
 * Handles event positioning, overlap detection, and layout management
 */

import {calcDOMElem, dateUtils, snapToNearestMinutes} from '../helpers.js';

// Color constants
const COLORS = {
  HOVER_BLUE: '#3498db',
  DEFAULT: '', // Reset to original
};

export default class ColumnObserver {
  constructor() {
    this.columns = {};
    this.overlappedEvents = {};
    this.eventUpdateFunctions = new Map(); // Store React state update functions
  }

  _registerColumn(colData) {
    this.columns[colData.element.id] = {
      events: [],
      _width: colData.width,
      _height: colData.height,
      _left: colData.left,
    };
  }

  _findEventInColumns(eventId) {
    for (const colId of Object.keys(this.columns)) {
      const events = this.columns[colId].events;
      const eventIndex = events.findIndex(ev => ev.id === eventId);
      if (eventIndex !== -1) {
        return {
          eventData: events[eventIndex],
          columnId: colId,
          eventIndex: eventIndex,
        };
      }
    }
    return null;
  }

  _removeEventFromColumns(eventData) {
    const eventId = typeof eventData === 'object' ? eventData.id : eventData;
    Object.keys(this.columns).forEach(key => {
      const columnEvents = this.columns[key].events;
      if (columnEvents.length > 0) {
        const eventIndex = columnEvents.findIndex(e => e.id === eventId);
        if (eventIndex !== -1) {
          // Remove from column events
          this.columns[key].events = columnEvents.filter(e => e.id !== eventId);
        }
      }
    });
  }

  _translateDateToColumnPosition(event, columnId) {
    const {startDate, endDate} = event;
    // Convert date/time to pixel coordinates
    // Assumes startDate and endDate are Date objects or ISO strings
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get column height for relative calculations
    const columnData = this.columns[columnId];
    const columnHeight = columnData?._height || 600; // fallback to 600px

    // Calculate duration in milliseconds
    const duration = end.getTime() - start.getTime();

    // Convert to hours for easier calculation
    const durationHours = duration / (1000 * 60 * 60);

    // Calculate pixels per hour based on column height (24 hours in a day)
    const pixelsPerHour = columnHeight / 24;
    const height = Math.max(durationHours * pixelsPerHour, 20); // minimum 20px height

    // Calculate top position based on start time
    // Assume day starts at 00:00, so get hour + minute offset
    const startHour = start.getHours() + start.getMinutes() / 60;
    const top = startHour * pixelsPerHour;

    return {
      top,
      height,
      bottom: top + height,
      left: columnData._left,
      width: columnData._width,
    };
  }

  _translateColumnPositionToDate(top, height, columnId) {
    // Get column data
    const columnData = this.columns[columnId];
    if (!columnData) return null;

    const columnHeight = columnData._height || 600; // fallback to 600px

    // Calculate pixels per hour (24 hours in a day)
    const pixelsPerHour = columnHeight / 24;

    // Calculate start time from top position
    const startHour = top / pixelsPerHour;
    const startHourInt = Math.floor(startHour);
    const rawStartMinutes = (startHour - startHourInt) * 60;
    let startMinutes = snapToNearestMinutes(rawStartMinutes, 15);
    let finalStartHour = startHourInt;

    // Handle minute overflow (60 minutes should become next hour)
    if (startMinutes >= 60) {
      finalStartHour += 1;
      startMinutes = 0;
    }

    // Calculate duration from height
    const durationHours = height / pixelsPerHour;

    // Extract date from columnId (assumes format contains YYYY-MM-DD)
    const dateMatch = columnId.match(/(\d{4}-\d{2}-\d{2})/);
    if (!dateMatch) return null;

    const baseDate = new Date(dateMatch[1]);
    if (isNaN(baseDate.getTime())) return null;

    // Create start date with calculated time
    const startDate = new Date(baseDate);
    startDate.setHours(finalStartHour, startMinutes, 0, 0);

    // Create end date by adding duration
    const endDate = new Date(startDate);
    endDate.setTime(startDate.getTime() + durationHours * 60 * 60 * 1000);

    // Calculate the corrected top position based on snapped time
    const snappedStartHour = finalStartHour + startMinutes / 60;
    const correctedTop = snappedStartHour * pixelsPerHour;

    return {
      startDate,
      endDate,
      top: correctedTop,
      bottom: correctedTop + height,
    };
  }

  _calculateElementLayout(elements, columnWidth, columnOffset) {
    const numberOfElements = elements.length;
    const elementWidth = columnWidth / numberOfElements;

    return elements.map((id, idx) => ({
      id,
      width: elementWidth,
      left: idx * elementWidth + columnOffset,
    }));
  }

  _recalculateOverlappedEvents(eventIds, columnId) {
    if (!eventIds || eventIds.length === 0)
      return {updatedEvents: [], affectedEventIds: []};

    // Get column metadata
    const columnData = this.columns[columnId];
    if (!columnData) return {updatedEvents: [], affectedEventIds: []};

    const columnWidth = columnData._width || 130;
    const columnOffset = columnData._left || 0;

    // Calculate new layout for overlapping events
    const layoutResults = this._calculateElementLayout(
      eventIds,
      columnWidth,
      columnOffset,
    );

    // Update events in the column with new positioning
    const updatedEvents = [];
    layoutResults.forEach(layout => {
      const eventIndex = columnData.events.findIndex(e => e.id === layout.id);
      if (eventIndex !== -1) {
        // Update the event's position properties
        columnData.events[eventIndex].left = layout.left;
        columnData.events[eventIndex].width = layout.width;

        // Add to updated events array
        updatedEvents.push(columnData.events[eventIndex]);
      }
    });

    return {
      updatedEvents: updatedEvents,
      affectedEventIds: eventIds,
    };
  }

  _checkEventsOverlap(event1, event2) {
    return !(event1.bottom <= event2.top || event1.top >= event2.bottom);
  }

  _getOverlappingEventsFromColumn(columnId) {
    const columnEvents = this.columns[columnId]?.events || [];

    if (columnEvents.length === 0) return [];

    // Track which events have been processed
    const processed = new Set();
    const overlapGroups = [];

    // For each unprocessed event, find all events it overlaps with
    columnEvents.forEach(event => {
      if (processed.has(event.id)) return;

      // Start a new overlap group with current event
      const currentGroup = [event.id];
      processed.add(event.id);

      // Find all events that overlap with any event in current group
      // We need to keep checking until no new overlaps are found
      let foundNewOverlap = true;
      while (foundNewOverlap) {
        foundNewOverlap = false;

        columnEvents.forEach(candidateEvent => {
          if (processed.has(candidateEvent.id)) return;

          // Check if candidate overlaps with any event in current group
          const overlapsWithGroup = currentGroup.some(groupEventId => {
            const groupEvent = columnEvents.find(e => e.id === groupEventId);
            return (
              groupEvent && this._checkEventsOverlap(groupEvent, candidateEvent)
            );
          });

          if (overlapsWithGroup) {
            currentGroup.push(candidateEvent.id);
            processed.add(candidateEvent.id);
            foundNewOverlap = true;
          }
        });
      }

      overlapGroups.push(currentGroup);
    });

    return overlapGroups;
  }

  _updateEventsInColumnById(columnId) {
    console.log(columnId)
    if (!this.columns[columnId]) return;

    const groups = this._getOverlappingEventsFromColumn(columnId);
    const calcGroups = groups.map(gr =>
      this._recalculateOverlappedEvents(gr, columnId),
    );

    calcGroups.forEach(gr => {
      gr.updatedEvents.forEach(ev => {
        const updateFunction = this.eventUpdateFunctions.get(ev.id);
        updateFunction?.(ev);
      });
    });
  }

  // Public methods
  registerColumns(columns) {
    columns.forEach(column => this._registerColumn(calcDOMElem(column)));
  }

  registerEventUpdateFunction(eventId, updateFunction) {
    this.eventUpdateFunctions.set(eventId, updateFunction);
  }

  unregisterEventUpdateFunction(eventId) {
    this.eventUpdateFunctions.delete(eventId);
  }

  registerEvent(eventData, callback) {
    let targetColumnId;

    // get the actuall column is currently on
    // Find appropriate column based on startDate
    const eventDate = new Date(eventData.startDate);
    const eventDateString = dateUtils.getYYYMMDD(eventDate); // YYYY-MM-DD format

    // Look for column ID that contains this date
    targetColumnId = Object.keys(this.columns).find(columnId =>
      columnId.includes(eventDateString),
    );

    if (!targetColumnId) return;

    const newData = {
      ...eventData,
      ...this._translateDateToColumnPosition(eventData, targetColumnId),
    };

    this.columns[targetColumnId].events.push(newData);
    callback?.(newData);
  }

  updateEvent(eventId, {top, left, currentColumnId}, cb) {
    // Find event in columns
    const found = this._findEventInColumns(eventId);
    if (!found || !currentColumnId) return cb({top, left});

    const {eventData, columnId, eventIndex} = found;

    const dateAndPosition = this._translateColumnPositionToDate(
      top,
      this.columns[columnId].events[eventIndex].height,
      columnId,
    );
    const {
      startDate,
      endDate,
      top: correctedTop,
      bottom: correctedBottom,
    } = dateAndPosition;
    // Check if event is in current column
    if (columnId === currentColumnId) {
      // Override left and top in same column with corrected positions
      this.columns[columnId].events[eventIndex].left = left;
      this.columns[columnId].events[eventIndex].top = correctedTop;
      this.columns[columnId].events[eventIndex].bottom = correctedBottom;
      this.columns[columnId].events[eventIndex].startDate = startDate;
      this.columns[columnId].events[eventIndex].endDate = endDate;

      cb?.(this.columns[columnId].events[eventIndex]);
    } else {
      // Remove from previous column and add to current one
      this._removeEventFromColumns(eventId);

      // Update event data with new position using corrected positions
      const updatedEventData = {
        ...eventData,
        left,
        top: correctedTop,
        bottom: correctedBottom,
        startDate,
        endDate,
      };

      // Push to new column
      this.columns[currentColumnId].events.push(updatedEventData);
      cb?.(updatedEventData);
    }
  }

  updateEventTop(eventId, newTop, cb) {
    // Find event in columns
    const found = this._findEventInColumns(eventId);
    if (!found) return;

    const {columnId, eventIndex} = found;
    const event = this.columns[columnId].events[eventIndex];

    // Keep original end time/bottom fixed
    const originalEndDate = new Date(event.endDate);

    // Calculate new height based on new top and original bottom
    const newHeight = event.bottom - newTop;

    // Minimum height constraint
    const minHeight = 20;
    const finalTop = newHeight < minHeight ? event.bottom - minHeight : newTop;
    const finalHeight = newHeight < minHeight ? minHeight : newHeight;

    // Translate new top position back to start date, keeping original end date
    const dateAndPosition = this._translateColumnPositionToDate(
      finalTop,
      finalHeight,
      columnId,
    );

    if (dateAndPosition) {
      let {startDate, top: correctedTop} = dateAndPosition;

      // If startDate is on a different day than endDate, clamp to midnight of endDate's day
      if (startDate.toDateString() !== originalEndDate.toDateString()) {
        startDate = new Date(originalEndDate);
        startDate.setHours(0, 0, 0, 0);

        // Recalculate correctedTop for midnight (top of the day)
        correctedTop = 0;
      }

      // Update with new start date but keep original end date
      this.columns[columnId].events[eventIndex].startDate = startDate;
      this.columns[columnId].events[eventIndex].endDate = originalEndDate;
      this.columns[columnId].events[eventIndex].top = correctedTop;

      // Keep original bottom and recalculate height based on corrected top
      this.columns[columnId].events[eventIndex].height =
        event.bottom - correctedTop;
    }

    cb?.(this.columns[columnId].events[eventIndex]);
  }

  updateEventBottom(eventId, newBottom, cb) {
    // Find event in columns
    const found = this._findEventInColumns(eventId);
    if (!found) return;

    const {columnId, eventIndex} = found;
    const event = this.columns[columnId].events[eventIndex];

    // Keep original start time/top fixed
    const originalStartDate = new Date(event.startDate);

    // Calculate new height based on original top and new bottom
    const newHeight = newBottom - event.top;

    // Minimum height constraint
    const minHeight = 20;
    const finalBottom =
      newHeight < minHeight ? event.top + minHeight : newBottom;

    // Get column data for calculations
    const columnData = this.columns[columnId];
    const columnHeight = columnData._height || 600;
    const pixelsPerHour = columnHeight / 24;

    // Calculate end time from bottom position and snap it
    const endHour = finalBottom / pixelsPerHour;
    const endHourInt = Math.floor(endHour);
    const rawEndMinutes = (endHour - endHourInt) * 60;
    let endMinutes = snapToNearestMinutes(rawEndMinutes, 15);
    let finalEndHour = endHourInt;

    // Handle minute overflow
    if (endMinutes >= 60) {
      finalEndHour += 1;
      endMinutes = 0;
    }

    if (finalEndHour > 23) {
      finalEndHour = 23;
      endMinutes = 59;
    }

    // Extract date from columnId
    const dateMatch = columnId.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      const baseDate = new Date(dateMatch[1]);

      baseDate.setHours(finalEndHour, endMinutes, 0, 0);

      // Calculate corrected bottom position from snapped time
      const snappedEndHour = finalEndHour + endMinutes / 60;
      const correctedBottom = snappedEndHour * pixelsPerHour;

      // Update with snapped values
      this.columns[columnId].events[eventIndex].startDate = originalStartDate;
      this.columns[columnId].events[eventIndex].endDate = baseDate;
      this.columns[columnId].events[eventIndex].bottom = correctedBottom;
      this.columns[columnId].events[eventIndex].height =
        correctedBottom - event.top;
    }

    cb?.(this.columns[columnId].events[eventIndex]);
  }

  // adjust to column
  calibrateEvent(eventId, sourceColumnId, cb) {
    const found = this._findEventInColumns(eventId);
    if (!found) return;

    const {columnId, eventIndex} = found;

    this.columns[columnId].events[eventIndex].left =
      this.columns[columnId]._left;

    this._updateEventsInColumnById(columnId);
    if (sourceColumnId) this._updateEventsInColumnById(sourceColumnId);

    cb?.(updatedEvent);
  }

  updateColumnWidth(columnId, newWidth, newLeft) {
    if (this.columns[columnId]) {
      this.columns[columnId]._width = newWidth;
      if (newLeft !== undefined) {
        this.columns[columnId]._left = newLeft;
      }
    }
  }

  updateAllColumns() {
    Object.keys(this.columns).forEach(columnId =>
      this._updateEventsInColumnById(columnId),
    );
  }
}
export {COLORS};
