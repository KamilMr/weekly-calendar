/**
 * Overlapping Event Manager (OEM)
 * Handles event positioning, overlap detection, and layout management
 */

import {calcDOMElem, dateUtils} from '../helpers.js';

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
      _heigth: colData.height,
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
    const columnHeight = columnData?._heigth || 600; // fallback to 600px

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

  addEventToColumn(eventData, columnId) {
    // eventData should be a plain object with: {id, top, bottom, width, height, left, startDate, endDate, ...}
    this.removeEventFromColumns(eventData);
    this.columns[columnId].events.push({
      id: eventData.id,
      top: eventData.top,
      bottom: eventData.bottom,
      width: eventData.width,
      height: eventData.height,
      left: eventData.left,
      startDate: eventData.startDate,
      endDate: eventData.endDate,
      ...eventData, // spread any additional properties
    });

    // check for overlaps and get wrapper dimensions if needed
    const overlappingIds = this._getOverlappingEventsFromColumn(
      eventData.id,
      columnId,
    );
    if (overlappingIds) {
      // Add the current event to the overlapping group
      const allOverlappingIds = [...overlappingIds, eventData.id];
      this._addToOverlapped(columnId, allOverlappingIds);
    }
  }

  removeEventFromColumn(eventId, columnId) {
    //NOTE col not exist in another impl
    this.columns[columnId].events = this.columns[columnId].events.filter(
      event => event.id !== eventId,
    );

    // remove from overlapped events
    this._removeFromOverlapped(eventId);
  }

  // Public method to remove event from all columns (like original oem)
  removeEventFromColumns(eventData) {
    const eventId = typeof eventData === 'object' ? eventData.id : eventData;
    Object.keys(this.columns)
      .filter(key => key.startsWith('column'))
      .forEach(key => {
        const columnEvents = this.columns[key].events;
        if (columnEvents) {
          const eventIndex = columnEvents.findIndex(e => e.id === eventId);
          if (eventIndex !== -1) {
            // Remove from overlap management before removing from column
            this.removeFromOverlapped(eventId);
            // Remove from column events
            this.columns[key].events = columnEvents.filter(e => e.id !== eventId);
          }
        }
      });
  }

  // Public method for external access (like original oem)
  getOverlappingEventsFromColumn(eId, columnId) {
    return this._getOverlappingEventsFromColumn(eId, columnId);
  }

  // Public method for external access (like original oem)
  addToOverlapped(cId, eIds) {
    return this._addToOverlapped(cId, eIds);
  }

  // Public method for external access (like original oem)
  removeFromOverlapped(eId) {
    return this._removeFromOverlapped(eId);
  }

  // Public method for external access (like original oem)
  get3CharId() {
    return this._get3CharId();
  }

  _removeFromOverlapped(eId) {
    Object.keys(this.overlappedEvents).forEach(cId => {
      const columnGroups = this.overlappedEvents[cId];
      Object.keys(columnGroups).forEach(groupId => {
        const eventIds = columnGroups[groupId].filter(id => id !== eId);

        if (eventIds.length <= 1) delete this.overlappedEvents[cId][groupId];
        else this.overlappedEvents[cId][groupId] = eventIds;
      });

      // if column has no groups remove it
      if (!Object.keys(columnGroups).length) delete this.overlappedEvents[cId];
    });
  }

  getColumnEvents(columnId) {
    return this.columns[columnId].events;
  }

  getColumnMetadata(columnId) {
    return this.columns[columnId];
  }

  updateColumnWidth(columnId, width) {
    if (this.columns[columnId]) {
      this.columns[columnId]._width = width;
    }
  }

  _getOverlappingEventsFromColumn(eId, columnId) {
    const columnEvents = this.columns[columnId]?.events || [];
    const targetEvent = columnEvents.find(e => e.id === eId);

    if (!targetEvent) return undefined;

    // iterate over them and if cross return all event Id it crosses with
    const overlappingIds = [];
    columnEvents.forEach(event => {
      if (event.id !== eId) {
        // Check if events overlap vertically
        const overlaps = !(
          targetEvent.bottom <= event.top || targetEvent.top >= event.bottom
        );
        if (overlaps) {
          overlappingIds.push(event.id);
        }
      }
    });

    // return output is undefined when ok or array of strings
    return overlappingIds.length > 0 ? overlappingIds : undefined;
  }

  _addToOverlapped(cId, eIds) {
    if (!this.overlappedEvents[cId]) {
      this.overlappedEvents[cId] = {};
    }

    // check if any of those eIds are present there
    const existingGroups = Object.entries(this.overlappedEvents[cId]);
    const groupsToRemove = [];

    existingGroups.forEach(([groupId, groupEventIds]) => {
      const hasOverlap = eIds.some(eId => groupEventIds.includes(eId));
      if (hasOverlap) {
        groupsToRemove.push(groupId);
      }
    });

    // if there are present remove this whole property that stores them
    groupsToRemove.forEach(groupId => {
      delete this.overlappedEvents[cId][groupId];
    });

    // append new id with new eIds
    const newGroupId = this._get3CharId();
    this.overlappedEvents[cId][newGroupId] = eIds;
  }

  _get3CharId() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const existingIds = new Set();
    Object.values(this.overlappedEvents).forEach(columnGroups => {
      Object.keys(columnGroups).forEach(groupId => {
        existingIds.add(groupId);
      });
    });

    let newId;
    do {
      newId = '';
      for (let i = 0; i < 3; i++) {
        newId += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (existingIds.has(newId));

    return newId;
  }

  getAllOverlappedGroups() {
    return Object.values(this.overlappedEvents)
      .map(group => Object.values(group))
      .flat();
  }

  getEventById(eventId) {
    return Object.values(this.columns)
      .map(column => column.events)
      .flat()
      .find(e => e.id === eventId);
  }

  getColIdEvIsLoc(eId) {
    const columns = Object.keys(this.columns);
    const column = columns.find(c =>
      (this.columns[c]?.events || [])
        .some(ev => ev.id === eId),
    );
    return column;
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

  _doEventsOverlap(eventId1, eventId2) {
    if (eventId1 === eventId2) return true;

    const event1 = this.getEventById(eventId1);
    const event2 = this.getEventById(eventId2);

    if (!event1 || !event2) return false;

    // Check if events overlap vertically
    return !(event1.bottom <= event2.top || event1.top >= event2.bottom);
  }

  calculateLayout(
    columnIds = Object.keys(this.columns).filter(c => !c.startsWith('_')),
    columnWidths = {},
    columnOffsets = {},
  ) {
    const layoutResults = {};

    columnIds.forEach(columnId => {
      const eventsInColumn = this.columns[columnId]?.events;
      if (!eventsInColumn) return;

      // get overlapped events
      const checkEvents = [];
      eventsInColumn.forEach(event => {
        if (checkEvents.flat().includes(event.id)) return;

        const overlaps = this._getOverlappingEventsFromColumn(
          event.id,
          columnId,
        );
        if (overlaps) {
          const overlapss = overlaps.concat(event.id);
          // sort by left offset
          const sorted = overlapss.sort(
            (a, b) => this.getEventById(a).left - this.getEventById(b).left,
          );
          checkEvents.push(sorted);
        } else checkEvents.push([event.id]);
      });

      checkEvents.forEach(gr => {
        const columnWidth = columnWidths[columnId] || 130; // default width
        const columnOffset = columnOffsets[columnId] || 0; // default offset
        const elementLayouts = this._calculateElementLayout(
          gr,
          columnWidth,
          columnOffset,
        );

        elementLayouts.forEach(layout => {
          layoutResults[layout.id] = {
            width: layout.width,
            left: layout.left,
            columnId: columnId,
          };
        });
      });
    });

    return layoutResults;
  }

  initializeColumns(columns) {
    columns.forEach(column => this._addColumn(column));
  }

  // Public method for external access (like original oem)
  calculateElementLayout(elements, columnWidth, columnOffset) {
    return this._calculateElementLayout(elements, columnWidth, columnOffset);
  }
}
export {COLORS};
