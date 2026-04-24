import { useConfigStore } from '../../../store/configStore';
import type { HandSide } from '../types';

// 키보드 레이아웃 정의 (KeyboardEvent.code 기준)
const KEYBOARD_ROWS: string[][] = [
  ['Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal', 'Backspace'],
  ['Tab', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash'],
  ['CapsLock', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote', 'Enter'],
  ['ShiftLeft', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash', 'ShiftRight'],
  ['ControlLeft', 'Space', 'ControlRight'],
];

const KEY_LABELS: Record<string, string> = {
  Backquote: '`', Minus: '-', Equal: '=', Backspace: '⌫',
  Tab: 'Tab', BracketLeft: '[', BracketRight: ']', Backslash: '\\',
  CapsLock: 'Caps', Semicolon: ';', Quote: "'", Enter: '↵',
  ShiftLeft: 'Shift', Comma: ',', Period: '.', Slash: '/', ShiftRight: 'Shift',
  ControlLeft: 'Ctrl', Space: 'Space', ControlRight: 'Ctrl',
};

// 코드 → 표시 라벨 변환
function getLabel(code: string): string {
  if (code in KEY_LABELS) return KEY_LABELS[code];
  // KeyA → A, Digit1 → 1
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return code;
}

const HAND_COLORS: Record<HandSide, string> = {
  left: '#4a9eff',
  right: '#ff6b6b',
  both: '#9b59b6',
};

const WIDE_KEYS = new Set(['Backspace', 'Tab', 'CapsLock', 'Enter', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'Space']);

interface Props {
  activeKey?: string;
}

export function KeyboardVisualizer({ activeKey }: Props) {
  const mappings = useConfigStore((s) => s.config.mappings);

  return (
    <div style={{ fontFamily: 'monospace', userSelect: 'none' }}>
      {KEYBOARD_ROWS.map((row, rowIdx) => (
        <div key={rowIdx} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
          {row.map((code) => {
            const mapping = mappings[code];
            const isActive = activeKey === code;
            const bgColor = mapping ? HAND_COLORS[mapping.hand] : '#555';

            return (
              <div
                key={code}
                title={mapping ? `${code}: ${mapping.hand} (intensity ${mapping.intensity})` : code}
                style={{
                  minWidth: WIDE_KEYS.has(code) ? (code === 'Space' ? 120 : 60) : 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#fff',
                  backgroundColor: bgColor,
                  opacity: isActive ? 1 : 0.65,
                  border: isActive ? '2px solid #fff' : '2px solid transparent',
                  transition: 'opacity 0.1s, border-color 0.1s',
                  cursor: 'default',
                  boxSizing: 'border-box',
                  flexShrink: 0,
                }}
              >
                {getLabel(code)}
              </div>
            );
          })}
        </div>
      ))}

      {/* 범례 */}
      <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12 }}>
        {(Object.entries(HAND_COLORS) as [HandSide, string][]).map(([hand, color]) => (
          <div key={hand} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: color }} />
            <span style={{ color: '#ccc' }}>
              {hand === 'left' ? '왼손' : hand === 'right' ? '오른손' : '양손'}
            </span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#555' }} />
          <span style={{ color: '#ccc' }}>미지정</span>
        </div>
      </div>
    </div>
  );
}
