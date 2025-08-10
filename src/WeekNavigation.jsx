const WeekNavigation = ({addSub, onNavigate, width = 60}) => {
  return (
    <div
      style={{
        width: `${width}px`,
        height: '30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <button
        onClick={() => onNavigate(addSub - 1)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '16px',
          padding: '4px',
          marginRight: '4px',
        }}
      >
        ←
      </button>
      <button
        onClick={() => onNavigate(addSub + 1)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '16px',
          padding: '4px',
        }}
      >
        →
      </button>
    </div>
  );
};

export default WeekNavigation;
