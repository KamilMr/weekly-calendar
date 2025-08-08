import {useEffect, useRef, useState} from 'react';

import {ColumnObserver} from './engine';
import {createInitialEvents, dateUtils} from './helpers';
import DraggableEvent from './DraggableEvent';
import {
  NUM_OF_COL,
  NUM_OF_EVENTS,
  COLUMN_WIDTH,
  COLUMN_HEIGHT,
  HOURS_PER_DAY,
  HOUR_HEIGHT,
  START_DAY_OF_WEEK,
} from './const';

import './styles.css';

const App = ({
  events = createInitialEvents(NUM_OF_EVENTS),
  onClick = () => {},
  onGrabEnd = () => {},
  startDay = START_DAY_OF_WEEK,
  numberOfCols = NUM_OF_COL,
}) => {
  const [columns, setColumns] = useState([]);
  const columnObserverRef = useRef();
  const columnRefs = useRef([]);

  // Initialize ColumnObserver and columns
  useEffect(() => {
    if (columnRefs.current.length !== numberOfCols) return;
    if (columnObserverRef.current) return;

    columnObserverRef.current = new ColumnObserver();
    columnObserverRef.current.registerColumns(columnRefs.current);

    setColumns(columnRefs.current);
  }, []);

  return (
    <div className="container">
      <div
        className="container"
        style={{display: 'flex', flexDirection: 'column'}}
      >
        {/* Day Headers */}
        <div style={{display: 'flex'}}>
          <div
            className="hour-header"
            style={{width: '60px', height: '30px'}}
          />
          {Array.from({length: numberOfCols}).map((_, idx) => (
            <div
              key={`header${idx + 1}`}
              id={`header${idx + 1}`}
              className="box"
              style={{
                textAlign: 'right',
                paddingRight: 2,
                fontWeight: 'bold',
                width: `${COLUMN_WIDTH}px`,
                height: '30px',
                borderBottom: 'none',
              }}
            >
              {dateUtils.getDay(
                dateUtils.addDayToDate(dateUtils.getStartOfWeek(startDay), idx),
              )}
            </div>
          ))}
        </div>

        {/* Calendar Columns */}
        <div
          className="container"
          style={{
            position: 'relative',
            minHeight: `${COLUMN_HEIGHT}px`,
            height: `${COLUMN_HEIGHT}px`,
            overflow: 'auto',
          }}
        >
          {/* Hour Labels */}
          <div
            className="hour-labels"
            style={{
              width: '60px',
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
            }}
          >
            {Array.from({length: HOURS_PER_DAY}).map((_, hour) => (
              <div
                key={hour}
                className="hour-label"
                style={{
                  height: `${HOUR_HEIGHT}px`,
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-end',
                  paddingRight: '8px',
                  fontSize: '12px',
                  color: '#666',
                  borderRight: '1px solid rgba(0, 0, 0, 0.1)',
                }}
              >
                {hour === 0
                  ? '12am'
                  : hour < 12
                    ? `${hour}am`
                    : hour === 12
                      ? '12pm'
                      : `${hour - 12}pm`}
              </div>
            ))}
          </div>

          {/* Calendar Columns */}
          <div style={{marginLeft: '60px', display: 'flex'}}>
            {Array.from({length: numberOfCols}).map((_, idx) => (
              <div
                key={`column${idx + 1}`}
                id={`column_${dateUtils.getYYYMMDD(dateUtils.addDayToDate(dateUtils.getStartOfWeek(startDay), idx))}`}
                className={`box box${idx + 1}`}
                ref={el => (columnRefs.current[idx] = el)}
              />
            ))}
          </div>

          {/* Hour Marker Lines */}
          <div
            style={{
              position: 'absolute',
              left: '60px',
              top: 0,
              width: `${numberOfCols * COLUMN_WIDTH}px`,
              height: '100%',
              pointerEvents: 'none',
            }}
          >
            {Array.from({length: HOURS_PER_DAY}).map((_, hour) => (
              <div
                key={`hour-line-${hour}`}
                style={{
                  position: 'absolute',
                  top: `${hour * HOUR_HEIGHT}px`,
                  left: 0,
                  width: '100%',
                  height: '1px',
                  backgroundColor: 'rgba(0, 0, 0, 0.1)',
                  borderTop:
                    hour === 0 ? 'none' : '1px solid rgba(0, 0, 0, 0.1)',
                }}
              />
            ))}
          </div>

          {/* Events */}
          <div style={{marginLeft: '60px'}}>
            {events.map(event => (
              <DraggableEvent
                key={event.id}
                event={event}
                columnObserver={columnObserverRef.current}
                columns={columns}
                onEventMove={() => {
                  console.log('onEventMove');
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
