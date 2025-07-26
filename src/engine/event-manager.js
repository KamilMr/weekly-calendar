/**
 * Overlapping Event Manager (OEM)
 * Handles event positioning, overlap detection, and layout management
 */

// Color constants
const COLORS = {
  HOVER_BLUE: '#3498db',
  DEFAULT: '', // Reset to original
};

export default class ColumnObserver {
  constructor() {
    this.columns = {};
    this.overlappedEvents = {};
  }

  addColumn(column) {
    this.columns[column.id] = [];
  }

  removeColumn(columnId) {
    delete this.columns[columnId];
  }

  addEventToColumn(event, columnId) {
    const rect = event.getBoundingClientRect();
    this.removeEventFromColumns(event);
    this.columns[columnId].push({
      id: event.id,
      top: rect.top,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
      left: rect.left,
      event: event,
    });

    // check for overlaps and get wrapper dimensions if needed
    const overlappingIds = this._getOverlappingEventsFromColumn(
      event.id,
      columnId,
    );
    if (overlappingIds) {
      // Add the current event to the overlapping group
      const allOverlappingIds = [...overlappingIds, event.id];
      this._addToOverlapped(columnId, allOverlappingIds);
    }
  }

  removeEventFromColumn(eventId, columnId) {
    //NOTE col not exist in another impl
    this.columns[columnId] = this.columns[columnId].filter(
      event => event.id !== eventId,
    );

    // remove from overlapped events
    this._removeFromOverlapped(eventId);
  }

  // Public method to remove event from all columns (like original oem)
  removeEventFromColumns(event) {
    Object.keys(this.columns)
      .filter(key => key.startsWith('column'))
      .forEach(key => {
        const columnEvents = this.columns[key];
        if (columnEvents) {
          const eventIndex = columnEvents.findIndex(e => e.id === event.id);
          if (eventIndex !== -1) {
            // Remove from overlap management before removing from column
            this.removeFromOverlapped(event.id);
            // Remove from column events
            this.columns[key] = columnEvents.filter(e => e.id !== event.id);
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
    return this.columns[columnId];
  }

  _getOverlappingEventsFromColumn(eId, columnId) {
    const columnEvents = this.columns[columnId] || [];
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
      .flat()
      .find(e => e.id === eventId);
  }

  getColIdEvIsLoc(eId) {
    const columns = Object.keys(this.columns);
    const column = columns.find(c =>
      Object.values(this.columns[c] || [])
        .flat()
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
      const eventsInColumn = this.columns[columnId];
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
    columns.forEach(column => (this.columns[column.id] = []));
  }

  // Public method for external access (like original oem)
  calculateElementLayout(elements, columnWidth, columnOffset) {
    return this._calculateElementLayout(elements, columnWidth, columnOffset);
  }
}
export {COLORS};
