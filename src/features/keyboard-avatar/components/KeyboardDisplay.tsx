// 오버레이용 미니 키보드 시각화
// 각 키마다 고유 색상, 누를 때 해당 색상으로 발광

const ROWS: string[][] = [
  ['KeyQ','KeyW','KeyE','KeyR'],
  ['KeyA','KeyS','KeyD','KeyF'],
  ['KeyZ','KeyX','KeyC'],
];

const LABELS: Record<string, string> = {
  KeyQ:'Q', KeyW:'W', KeyE:'E', KeyR:'R',
  KeyA:'A', KeyS:'S', KeyD:'D', KeyF:'F',
  KeyZ:'Z', KeyX:'X', KeyC:'C',
};

// 자연스러운 게이밍 색상 (flat UI 팔레트 기반)
const KEY_COLORS: Record<string, string> = {
  KeyQ: '#C9A227', // 다크 골드
  KeyW: '#C0392B', // 루비 레드
  KeyE: '#27AE60', // 에메랄드
  KeyR: '#2980B9', // 사파이어
  KeyA: '#8E44AD', // 아메시스트
  KeyS: '#16A085', // 청록
  KeyD: '#E67E22', // 토파즈 오렌지
  KeyF: '#1ABC9C', // 터콰이즈
  KeyZ: '#E74C3C', // 크림슨
  KeyX: '#6C5CE7', // 소프트 퍼플
  KeyC: '#2ECC71', // 라임 그린
};

const KEY_SIZE = 24; // px
const GAP = 3;       // px

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

interface KeyCapProps {
  keyCode: string;
  pressed: boolean;
}

function KeyCap({ keyCode, pressed }: KeyCapProps) {
  const keyColor = KEY_COLORS[keyCode] ?? '#888888';

  const bg = pressed ? keyColor : '#000000';
  const border = `1px solid ${hexToRgba(keyColor, pressed ? 1 : 0.4)}`;
  const shadow = pressed
    ? `0 0 8px ${hexToRgba(keyColor, 0.95)}, 0 0 20px ${hexToRgba(keyColor, 0.55)}`
    : 'none';

  return (
    <div
      style={{
        width: KEY_SIZE,
        height: KEY_SIZE,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 4,
        fontSize: 9,
        fontWeight: 700,
        fontFamily: 'monospace',
        userSelect: 'none',
        backgroundColor: bg,
        border,
        color: '#ffffff',
        boxShadow: shadow,
        transition: 'background-color 0.05s ease, box-shadow 0.05s ease',
        flexShrink: 0,
      }}
    >
      {LABELS[keyCode] ?? keyCode}
    </div>
  );
}

interface KeyboardDisplayProps {
  pressedKeys: Set<string>;
}

export function KeyboardDisplay({ pressedKeys }: KeyboardDisplayProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
        {ROWS.map((row, ri) => (
          <div key={ri} style={{ display: 'flex', gap: GAP }}>
            {row.map((keyCode) => (
              <KeyCap
                key={keyCode}
                keyCode={keyCode}
                pressed={pressedKeys.has(keyCode)}
              />
            ))}
          </div>
        ))}
    </div>
  );
}
