import React, {useEffect, useRef, useState} from 'react';

import {ColumnObserver, COLORS} from './engine';
import {createInitialEvents, dateUtils} from './helpers';
import DraggableEvent from './DraggableEvent';

import './styles.css';

const NUM_OF_COL = 7;
const NUM_OF_EVENTS = 8;

const App = ({
  events = createInitialEvents(NUM_OF_EVENTS),
  onClick = () => {},
  onGrabEnd = () => {},
}) => {
  const [columns, setColumns] = useState([]);
  const columnObserverRef = useRef();
  const columnRefs = useRef([]);

  // Initialize ColumnObserver and columns
  useEffect(() => {
    if (columnRefs.current.length !== NUM_OF_COL) return;
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
              onEventMove={() => {
                console.log('onEventMove');
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;
