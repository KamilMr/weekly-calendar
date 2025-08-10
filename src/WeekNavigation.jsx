const WeekNavigation = ({
  text = '',
  addSub,
  onNavigate,
  style = {
    root: {},
  },
}) => {
  return (
    <div
      style={{
        padding: 24,
        width: 300,
        height: '30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...style.root,
      }}
    >
      <button
        onClick={() => onNavigate(addSub - 1)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '1.8em',
          padding: '4px',
          marginRight: '4px',
        }}
      >
        ←
      </button>
      <h6>{text}</h6>
      <button
        onClick={() => onNavigate(addSub + 1)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '1.8em',
          padding: '4px',
        }}
      >
        →
      </button>
    </div>
  );
};

export default WeekNavigation;
