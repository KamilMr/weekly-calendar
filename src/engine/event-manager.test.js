import ColumnObserver from './event-manager.js';

describe('ColumnObserver', () => {
  let observer;

  beforeEach(() => {
    observer = new ColumnObserver();
  });

  describe('initializeColumns', () => {
    test('should add column to columns object', () => {
      const mockColumns = [
        {id: 'column_2025-07-26'},
        {id: 'column_2025-07-27'},
      ];

      observer.initializeColumns(mockColumns);

      expect(observer.columns['column_2025-07-26']).toEqual([]);
      expect(observer.columns['column_2025-07-27']).toEqual([]);
      expect(Object.keys(observer.columns)).toHaveLength(2);
    });
  });

  describe('addEventToColumn', () => {
    test('should detect overlapping events when adding event to column with two matching events', () => {
      // Initialize columns
      observer.initializeColumns([{id: 'column_2025-07-26'}]);

      // Create mock overlapping events
      const mockEvent1 = {
        id: 'event1',
        getBoundingClientRect: () => ({
          top: 100,
          bottom: 200,
          left: 10,
          width: 120,
          height: 100,
        }),
      };

      const mockEvent2 = {
        id: 'event2',
        getBoundingClientRect: () => ({
          top: 150,
          bottom: 250,
          left: 10,
          width: 120,
          height: 100,
        }),
      };

      const mockEvent3 = {
        id: 'event3',
        getBoundingClientRect: () => ({
          top: 180,
          bottom: 280,
          left: 10,
          width: 120,
          height: 100,
        }),
      };

      // Add first two overlapping events
      observer.addEventToColumn(mockEvent1, 'column_2025-07-26');
      observer.addEventToColumn(mockEvent2, 'column_2025-07-26');

      // Add third event that overlaps with second event
      observer.addEventToColumn(mockEvent3, 'column_2025-07-26');

      // Verify all events are in the column
      expect(observer.columns['column_2025-07-26']).toHaveLength(3);
      console.log(observer.columns);

      // Verify overlapping events are detected
      const overlappingGroups = observer.getAllOverlappedGroups();
      expect(overlappingGroups).toHaveLength(1);
      expect(overlappingGroups[0]).toEqual(['event1', 'event2', 'event3']);
    });
  });
});
