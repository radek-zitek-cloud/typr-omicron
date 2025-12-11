import { useMemo } from 'react';
import './KeyboardHeatmap.css';

function KeyboardHeatmap({ data, title }) {
  // Keyboard layout (simplified QWERTY)
  const keyboardLayout = [
    ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
    ['Tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
    ['CapsLock', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'Enter'],
    ['ShiftLeft', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'ShiftRight'],
    ['ControlLeft', 'Space', 'ControlRight']
  ];

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

  const getHeatColor = (value) => {
    if (!value || maxValue === minValue) {
      return '#e0e0e0';
    }

    // Normalize value between 0 and 1
    const normalized = (value - minValue) / (maxValue - minValue);

    // Color gradient from green (low) to red (high)
    const hue = (1 - normalized) * 120; // 120 is green, 0 is red
    return `hsl(${hue}, 70%, 50%)`;
  };

  const getKeyValue = (key) => {
    // Try exact match first
    if (data && data[key] !== undefined) {
      return data[key];
    }

    // Try lowercase match
    const lowerKey = key.toLowerCase();
    if (data && data[lowerKey] !== undefined) {
      return data[lowerKey];
    }

    // Try special key matches
    if (key === ' ' && data && data['Space'] !== undefined) {
      return data['Space'];
    }

    return null;
  };

  const getKeyClass = (key) => {
    let className = 'keyboard-key';
    
    // Add special key classes
    if (key === 'Backspace' || key === 'Enter' || key === 'Tab' || 
        key === 'CapsLock' || key === 'ShiftLeft' || key === 'ShiftRight' ||
        key === 'ControlLeft' || key === 'ControlRight') {
      className += ' special-key';
    }
    
    if (key === 'Space') {
      className += ' spacebar';
    }

    return className;
  };

  const getKeyDisplay = (key) => {
    const displayNames = {
      'Backspace': '⌫',
      'Tab': '⇥',
      'CapsLock': '⇪',
      'Enter': '↵',
      'ShiftLeft': '⇧',
      'ShiftRight': '⇧',
      'ControlLeft': 'Ctrl',
      'ControlRight': 'Ctrl',
      'Space': ''
    };
    return displayNames[key] || key;
  };

  return (
    <div className="keyboard-heatmap">
      <h3>{title}</h3>
      <div className="keyboard">
        {keyboardLayout.map((row, rowIndex) => (
          <div key={rowIndex} className="keyboard-row">
            {row.map((key, keyIndex) => {
              const value = getKeyValue(key);
              const bgColor = getHeatColor(value);
              
              return (
                <div
                  key={keyIndex}
                  className={getKeyClass(key)}
                  style={{ backgroundColor: bgColor }}
                  title={value ? `${key}: ${value.toFixed(2)}ms` : key}
                >
                  <span className="key-label">{getKeyDisplay(key)}</span>
                  {value && (
                    <span className="key-value">{value.toFixed(0)}</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      
      <div className="heatmap-legend">
        <span>Low ({minValue.toFixed(0)}ms)</span>
        <div className="legend-gradient"></div>
        <span>High ({maxValue.toFixed(0)}ms)</span>
      </div>
    </div>
  );
}

export default KeyboardHeatmap;
