import { useMemo } from 'react';
import './HandHeatmap.css';

function HandHeatmap({ data, title }) {
  const { minValue, maxValue } = useMemo(() => {
    if (!data || Object.keys(data).length === 0) {
      return { minValue: 0, maxValue: 100 };
    }

    const values = Object.values(data);
    return {
      minValue: Math.min(...values),
      maxValue: Math.max(...values)
    };
  }, [data]);

  const getHeatColor = (fingerCode) => {
    if (!data || !data[fingerCode] || maxValue === minValue) {
      return '#e0e0e0';
    }

    const value = data[fingerCode];
    const normalized = (value - minValue) / (maxValue - minValue);

    // Color gradient from green (low) to red (high)
    const hue = (1 - normalized) * 120;
    return `hsl(${hue}, 70%, 50%)`;
  };

  const fingers = [
    { code: 'LP', name: 'Pinky', hand: 'left' },
    { code: 'LR', name: 'Ring', hand: 'left' },
    { code: 'LM', name: 'Middle', hand: 'left' },
    { code: 'LI', name: 'Index', hand: 'left' },
    { code: 'LT', name: 'Thumb', hand: 'left' },
    { code: 'RT', name: 'Thumb', hand: 'right' },
    { code: 'RI', name: 'Index', hand: 'right' },
    { code: 'RM', name: 'Middle', hand: 'right' },
    { code: 'RR', name: 'Ring', hand: 'right' },
    { code: 'RP', name: 'Pinky', hand: 'right' },
  ];

  return (
    <div className="hand-heatmap">
      <h3>{title}</h3>
      <div className="hands-container">
        <div className="hand left-hand">
          <h4>Left Hand</h4>
          <div className="fingers">
            {fingers.filter(f => f.hand === 'left').map(finger => (
              <div
                key={finger.code}
                className="finger"
                style={{ backgroundColor: getHeatColor(finger.code) }}
                title={data && data[finger.code] && typeof data[finger.code] === 'number' ? `${finger.name}: ${data[finger.code].toFixed(2)}ms` : finger.name}
              >
                <div className="finger-name">{finger.name}</div>
                {data && data[finger.code] && typeof data[finger.code] === 'number' && (
                  <div className="finger-value">{data[finger.code].toFixed(1)}ms</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="hand right-hand">
          <h4>Right Hand</h4>
          <div className="fingers">
            {fingers.filter(f => f.hand === 'right').map(finger => (
              <div
                key={finger.code}
                className="finger"
                style={{ backgroundColor: getHeatColor(finger.code) }}
                title={data && data[finger.code] && typeof data[finger.code] === 'number' ? `${finger.name}: ${data[finger.code].toFixed(2)}ms` : finger.name}
              >
                <div className="finger-name">{finger.name}</div>
                {data && data[finger.code] && typeof data[finger.code] === 'number' && (
                  <div className="finger-value">{data[finger.code].toFixed(1)}ms</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="heatmap-legend">
        <span>Low ({minValue.toFixed(0)}ms)</span>
        <div className="legend-gradient"></div>
        <span>High ({maxValue.toFixed(0)}ms)</span>
      </div>
    </div>
  );
}

export default HandHeatmap;
