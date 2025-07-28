import ColumnObserver from './event-manager.js';

describe('ColumnObserver', () => {
  let observer;

  beforeEach(() => {
    observer = new ColumnObserver();
  });

  describe('registerColumns', () => {
    it('should register multiple columns correctly', () => {
      // Mock DOM elements with getBoundingClientRect
      const mockColumn1 = {
        id: 'col-2025-01-01',
        getBoundingClientRect: jest.fn(() => ({
          left: 0,
          top: 0,
          bottom: 600,
          width: 130,
          height: 600,
        })),
      };
      const mockColumn2 = {
        id: 'col-2025-01-02',
        getBoundingClientRect: jest.fn(() => ({
          left: 130,
          top: 0,
          bottom: 600,
          width: 130,
          height: 600,
        })),
      };
      const mockColumn3 = {
        id: 'col-2025-01-03',
        getBoundingClientRect: jest.fn(() => ({
          left: 260,
          top: 0,
          bottom: 600,
          width: 130,
          height: 600,
        })),
      };

      const columns = [mockColumn1, mockColumn2, mockColumn3];

      observer.registerColumns(columns);

      expect(observer.columns['col-2025-01-01']).toEqual({
        events: [],
        _width: 130,
        _heigth: 600,
        _left: 0,
      });

      expect(observer.columns['col-2025-01-02']).toEqual({
        events: [],
        _width: 130,
        _heigth: 600,
        _left: 130,
      });

      expect(observer.columns['col-2025-01-03']).toEqual({
        events: [],
        _width: 130,
        _heigth: 600,
        _left: 260,
      });

      // Verify getBoundingClientRect was called
      expect(mockColumn1.getBoundingClientRect).toHaveBeenCalled();
      expect(mockColumn2.getBoundingClientRect).toHaveBeenCalled();
      expect(mockColumn3.getBoundingClientRect).toHaveBeenCalled();
    });

    it('should handle empty array of columns', () => {
      observer.registerColumns([]);

      expect(Object.keys(observer.columns)).toHaveLength(0);
    });
  });

  describe('registerEvent', () => {
    beforeEach(() => {
      const mockColumn1 = {
        id: 'col-2025-01-15',
        getBoundingClientRect: jest.fn(() => ({
          left: 0,
          top: 0,
          bottom: 600,
          width: 130,
          height: 600,
        })),
      };
      const mockColumn2 = {
        id: 'col-2025-01-16',
        getBoundingClientRect: jest.fn(() => ({
          left: 130,
          top: 0,
          bottom: 600,
          width: 130,
          height: 600,
        })),
      };
      const columns = [mockColumn1, mockColumn2];
      observer.registerColumns(columns);
    });

    it('should register event in correct column based on startDate', () => {
      const eventData = {
        id: 'event1',
        startDate: new Date('2025-01-15T10:00:00'),
        endDate: new Date('2025-01-15T11:00:00'),
        title: 'Test Event',
      };

      observer.registerEvent(eventData);

      expect(observer.columns['col-2025-01-15'].events).toHaveLength(1);
      expect(observer.columns['col-2025-01-15'].events[0]).toMatchObject(eventData);
      expect(observer.columns['col-2025-01-15'].events[0]).toHaveProperty('top');
      expect(observer.columns['col-2025-01-15'].events[0]).toHaveProperty('left');
      expect(observer.columns['col-2025-01-15'].events[0]).toHaveProperty('height');
      expect(observer.columns['col-2025-01-15'].events[0]).toHaveProperty('width');
      expect(observer.columns['col-2025-01-16'].events).toHaveLength(0);
    });

    it('should call callback when provided', () => {
      const callback = jest.fn();
      const eventData = {
        id: 'event2',
        startDate: new Date('2025-01-16T14:00:00'),
        endDate: new Date('2025-01-16T15:00:00'),
        title: 'Another Event',
      };

      observer.registerEvent(eventData, callback);

      expect(callback).toHaveBeenCalled();
      expect(observer.columns['col-2025-01-16'].events).toHaveLength(1);
    });

    it('should not register event if no matching column found', () => {
      const eventData = {
        id: 'event3',
        startDate: new Date('2025-01-20T10:00:00'), // Date not in any column
        endDate: new Date('2025-01-20T11:00:00'),
        title: 'Orphan Event',
      };

      observer.registerEvent(eventData);

      expect(observer.columns['col-2025-01-15'].events).toHaveLength(0);
      expect(observer.columns['col-2025-01-16'].events).toHaveLength(0);
    });

    it('should handle multiple events in same column', () => {
      const event1 = {
        id: 'event1',
        startDate: new Date('2025-01-15T10:00:00'),
        endDate: new Date('2025-01-15T11:00:00'),
        title: 'Event 1',
      };

      const event2 = {
        id: 'event2',
        startDate: new Date('2025-01-15T14:00:00'),
        endDate: new Date('2025-01-15T15:00:00'),
        title: 'Event 2',
      };

      observer.registerEvent(event1);
      observer.registerEvent(event2);

      expect(observer.columns['col-2025-01-15'].events).toHaveLength(2);
      expect(observer.columns['col-2025-01-15'].events[0]).toMatchObject(event1);
      expect(observer.columns['col-2025-01-15'].events[1]).toMatchObject(event2);
    });
  });

  describe('updateEvent', () => {
    beforeEach(() => {
      const mockColumn1 = {
        id: 'col-2025-01-15',
        getBoundingClientRect: jest.fn(() => ({
          left: 0,
          top: 0,
          bottom: 600,
          width: 130,
          height: 600,
        })),
      };
      const mockColumn2 = {
        id: 'col-2025-01-16',
        getBoundingClientRect: jest.fn(() => ({
          left: 130,
          top: 0,
          bottom: 600,
          width: 130,
          height: 600,
        })),
      };
      const columns = [mockColumn1, mockColumn2];
      observer.registerColumns(columns);

      const eventData = {
        id: 'event1',
        startDate: new Date('2025-01-15T10:00:00'),
        endDate: new Date('2025-01-15T11:00:00'),
        title: 'Test Event',
        left: 10,
        top: 100,
      };
      observer.registerEvent(eventData);
    });

    it('should update event position within same column', () => {
      const callback = jest.fn();
      const newPosition = {
        top: 200,
        left: 50,
        currentColumnId: 'col-2025-01-15',
      };

      observer.updateEvent('event1', newPosition, callback);

      const updatedEvent = observer.columns['col-2025-01-15'].events[0];
      expect(updatedEvent.top).toBe(200);
      expect(updatedEvent.left).toBe(50);
      expect(callback).toHaveBeenCalledWith(updatedEvent);
      expect(observer.columns['col-2025-01-15'].events).toHaveLength(1);
    });

    it('should move event to different column', () => {
      const callback = jest.fn();
      const newPosition = {
        top: 150,
        left: 200,
        currentColumnId: 'col-2025-01-16',
      };

      observer.updateEvent('event1', newPosition, callback);

      expect(observer.columns['col-2025-01-15'].events).toHaveLength(0);
      expect(observer.columns['col-2025-01-16'].events).toHaveLength(1);

      const movedEvent = observer.columns['col-2025-01-16'].events[0];
      expect(movedEvent.top).toBe(150);
      expect(movedEvent.left).toBe(200);
      expect(movedEvent.id).toBe('event1');
      expect(callback).toHaveBeenCalledWith(movedEvent);
    });

    it('should preserve other event properties when moving', () => {
      const callback = jest.fn();
      const newPosition = {
        top: 300,
        left: 400,
        currentColumnId: 'col-2025-01-16',
      };

      observer.updateEvent('event1', newPosition, callback);

      const movedEvent = observer.columns['col-2025-01-16'].events[0];
      expect(movedEvent.title).toBe('Test Event');
      expect(movedEvent.startDate).toEqual(new Date('2025-01-15T10:00:00'));
      expect(movedEvent.endDate).toEqual(new Date('2025-01-15T11:00:00'));
    });

    it('should call callback if event not found', () => {
      const callback = jest.fn();
      const newPosition = {
        top: 200,
        left: 50,
        currentColumnId: 'col-2025-01-15',
      };

      observer.updateEvent('nonexistent', newPosition, callback);

      expect(callback).toHaveBeenCalled();
      expect(observer.columns['col-2025-01-15'].events).toHaveLength(1);
      expect(observer.columns['col-2025-01-16'].events).toHaveLength(0);
    });

    it('should handle callback being undefined', () => {
      const newPosition = {
        top: 250,
        left: 75,
        currentColumnId: 'col-2025-01-15',
      };

      expect(() => {
        observer.updateEvent('event1', newPosition);
      }).not.toThrow();

      const updatedEvent = observer.columns['col-2025-01-15'].events[0];
      expect(updatedEvent.top).toBe(250);
      expect(updatedEvent.left).toBe(75);
    });
  });

  describe('_getOverlappingEventsFromColumn', () => {
    beforeEach(() => {
      const mockColumn = {
        id: 'col-2025-01-15',
        getBoundingClientRect: jest.fn(() => ({
          left: 0,
          top: 0,
          bottom: 600,
          width: 130,
          height: 600,
        })),
      };
      const columns = [mockColumn];
      observer.registerColumns(columns);
    });

    it('should return empty array when no events in column', () => {
      const result = observer._getOverlappingEventsFromColumn('col-2025-01-15');
      expect(result).toEqual([]);
    });

    it('should return single-element array for single event', () => {
      const event = {
        id: 'event1',
        startDate: new Date('2025-01-15T10:00:00'),
        endDate: new Date('2025-01-15T11:00:00'),
        title: 'Single Event',
      };
      observer.registerEvent(event);

      const result = observer._getOverlappingEventsFromColumn('col-2025-01-15');
      expect(result).toEqual([['event1']]);
    });

    it('should return separate arrays for non-overlapping events', () => {
      const event1 = {
        id: 'event1',
        startDate: new Date('2025-01-15T10:00:00'),
        endDate: new Date('2025-01-15T11:00:00'),
        title: 'Event 1',
      };
      const event2 = {
        id: 'event2',
        startDate: new Date('2025-01-15T14:00:00'),
        endDate: new Date('2025-01-15T15:00:00'),
        title: 'Event 2',
      };
      
      observer.registerEvent(event1);
      observer.registerEvent(event2);

      const result = observer._getOverlappingEventsFromColumn('col-2025-01-15');
      expect(result).toHaveLength(2);
      expect(result).toContainEqual(['event1']);
      expect(result).toContainEqual(['event2']);
    });

    it('should return single array for two overlapping events', () => {
      const event1 = {
        id: 'event1',
        startDate: new Date('2025-01-15T10:00:00'),
        endDate: new Date('2025-01-15T11:30:00'),
        title: 'Event 1',
      };
      const event2 = {
        id: 'event2',
        startDate: new Date('2025-01-15T11:00:00'),
        endDate: new Date('2025-01-15T12:00:00'),
        title: 'Event 2',
      };
      
      observer.registerEvent(event1);
      observer.registerEvent(event2);

      const result = observer._getOverlappingEventsFromColumn('col-2025-01-15');
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(2);
      expect(result[0]).toContain('event1');
      expect(result[0]).toContain('event2');
    });

    it('should handle chain of overlaps (A overlaps B, B overlaps C)', () => {
      const eventA = {
        id: 'eventA',
        startDate: new Date('2025-01-15T10:00:00'),
        endDate: new Date('2025-01-15T11:30:00'),
        title: 'Event A',
      };
      const eventB = {
        id: 'eventB',
        startDate: new Date('2025-01-15T11:00:00'),
        endDate: new Date('2025-01-15T12:30:00'),
        title: 'Event B',
      };
      const eventC = {
        id: 'eventC',
        startDate: new Date('2025-01-15T12:00:00'),
        endDate: new Date('2025-01-15T13:00:00'),
        title: 'Event C',
      };
      
      observer.registerEvent(eventA);
      observer.registerEvent(eventB);
      observer.registerEvent(eventC);

      const result = observer._getOverlappingEventsFromColumn('col-2025-01-15');
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(3);
      expect(result[0]).toContain('eventA');
      expect(result[0]).toContain('eventB');
      expect(result[0]).toContain('eventC');
    });

    it('should return multiple groups for separate overlapping pairs', () => {
      const event1 = {
        id: 'event1',
        startDate: new Date('2025-01-15T10:00:00'),
        endDate: new Date('2025-01-15T11:30:00'),
        title: 'Event 1',
      };
      const event2 = {
        id: 'event2',
        startDate: new Date('2025-01-15T11:00:00'),
        endDate: new Date('2025-01-15T12:00:00'),
        title: 'Event 2',
      };
      const event3 = {
        id: 'event3',
        startDate: new Date('2025-01-15T14:00:00'),
        endDate: new Date('2025-01-15T15:30:00'),
        title: 'Event 3',
      };
      const event4 = {
        id: 'event4',
        startDate: new Date('2025-01-15T15:00:00'),
        endDate: new Date('2025-01-15T16:00:00'),
        title: 'Event 4',
      };
      const event5 = {
        id: 'event5',
        startDate: new Date('2025-01-15T18:00:00'),
        endDate: new Date('2025-01-15T19:00:00'),
        title: 'Event 5',
      };
      
      observer.registerEvent(event1);
      observer.registerEvent(event2);
      observer.registerEvent(event3);
      observer.registerEvent(event4);
      observer.registerEvent(event5);

      const result = observer._getOverlappingEventsFromColumn('col-2025-01-15');
      expect(result).toHaveLength(3);
      
      // Find the groups
      const group1 = result.find(group => group.includes('event1'));
      const group2 = result.find(group => group.includes('event3'));
      const group3 = result.find(group => group.includes('event5'));
      
      expect(group1).toEqual(expect.arrayContaining(['event1', 'event2']));
      expect(group2).toEqual(expect.arrayContaining(['event3', 'event4']));
      expect(group3).toEqual(['event5']);
    });

    it('should return empty array for non-existent column', () => {
      const result = observer._getOverlappingEventsFromColumn('non-existent');
      expect(result).toEqual([]);
    });
  });
});
