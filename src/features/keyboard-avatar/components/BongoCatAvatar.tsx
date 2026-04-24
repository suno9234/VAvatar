import type { SpriteSet } from '../../../store/configStore';

interface BongoCatAvatarProps {
  leftPressed: boolean;
  rightPressed: boolean;
  sprites: SpriteSet;
}

const imgStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  userSelect: 'none',
  pointerEvents: 'none',
};

export function BongoCatAvatar({ leftPressed, rightPressed, sprites }: BongoCatAvatarProps) {
  return (
    // 스프라이트 캔버스 — 400:320 비율 유지
    <div style={{ position: 'relative', width: '100%', aspectRatio: '400 / 320' }}>
      {/* 레이어 1: 바디 (항상 표시) */}
      <img src={sprites.body} alt="" style={imgStyle} draggable={false} />
      {/* 레이어 2: 왼팔 */}
      <img
        src={leftPressed ? sprites.leftArmDown : sprites.leftArmUp}
        alt=""
        style={imgStyle}
        draggable={false}
      />
      {/* 레이어 3: 오른팔 */}
      <img
        src={rightPressed ? sprites.rightArmDown : sprites.rightArmUp}
        alt=""
        style={imgStyle}
        draggable={false}
      />
    </div>
  );
}
