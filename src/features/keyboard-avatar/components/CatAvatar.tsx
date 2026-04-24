interface Props {
  leftPressed: boolean;
  rightPressed: boolean;
}

const C = {
  body: '#FFB347',
  earInner: '#FF9EB5',
  belly: '#FDE8C8',
  pawPad: '#FFAABB',
  eye: '#2C3E50',
  shine: '#FFFFFF',
  nose: '#FF9EB5',
  whisker: '#999999',
  mouth: '#C08090',
};

export function CatAvatar({ leftPressed, rightPressed }: Props) {
  // 팔이 늘어나는 양 (px)
  const LEFT_EXTEND = leftPressed ? 42 : 0;
  const RIGHT_EXTEND = rightPressed ? 42 : 0;

  const transition = (pressed: boolean) =>
    pressed
      ? 'all 0.05s ease-out'
      : 'all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)';

  return (
    <svg
      viewBox="0 0 200 330"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: 240, height: 396 }}
    >
      {/* 꼬리 */}
      <path
        d="M136,242 Q178,268 170,296 Q162,318 148,308"
        stroke={C.body}
        strokeWidth="13"
        strokeLinecap="round"
        fill="none"
      />

      {/* 몸통 */}
      <ellipse cx="100" cy="210" rx="46" ry="55" fill={C.body} />
      {/* 배 */}
      <ellipse cx="100" cy="216" rx="26" ry="37" fill={C.belly} />

      {/* 왼쪽 팔 (늘어남) */}
      <g style={{ transition: transition(leftPressed) }}>
        <rect
          x="34" y="178"
          width="25"
          height={62 + LEFT_EXTEND}
          rx="12"
          fill={C.body}
          style={{ transition: transition(leftPressed) }}
        />
        {/* 왼쪽 발 */}
        <ellipse
          cx="46" cy={243 + LEFT_EXTEND}
          rx="16" ry="12"
          fill={C.body}
          style={{ transition: transition(leftPressed) }}
        />
        <ellipse cx="37" cy={252 + LEFT_EXTEND} rx="8" ry="7" fill={C.pawPad} style={{ transition: transition(leftPressed) }} />
        <ellipse cx="46" cy={256 + LEFT_EXTEND} rx="8" ry="7" fill={C.pawPad} style={{ transition: transition(leftPressed) }} />
        <ellipse cx="55" cy={252 + LEFT_EXTEND} rx="8" ry="7" fill={C.pawPad} style={{ transition: transition(leftPressed) }} />
      </g>

      {/* 오른쪽 팔 (늘어남) */}
      <g style={{ transition: transition(rightPressed) }}>
        <rect
          x="141" y="178"
          width="25"
          height={62 + RIGHT_EXTEND}
          rx="12"
          fill={C.body}
          style={{ transition: transition(rightPressed) }}
        />
        {/* 오른쪽 발 */}
        <ellipse
          cx="154" cy={243 + RIGHT_EXTEND}
          rx="16" ry="12"
          fill={C.body}
          style={{ transition: transition(rightPressed) }}
        />
        <ellipse cx="145" cy={252 + RIGHT_EXTEND} rx="8" ry="7" fill={C.pawPad} style={{ transition: transition(rightPressed) }} />
        <ellipse cx="154" cy={256 + RIGHT_EXTEND} rx="8" ry="7" fill={C.pawPad} style={{ transition: transition(rightPressed) }} />
        <ellipse cx="163" cy={252 + RIGHT_EXTEND} rx="8" ry="7" fill={C.pawPad} style={{ transition: transition(rightPressed) }} />
      </g>

      {/* 귀 (머리 아래) */}
      <polygon points="62,88 78,20 100,84" fill={C.body} />
      <polygon points="138,88 122,20 100,84" fill={C.body} />

      {/* 머리 */}
      <circle cx="100" cy="103" r="62" fill={C.body} />

      {/* 귀 안쪽 (핑크) */}
      <polygon points="67,84 80,30 97,81" fill={C.earInner} />
      <polygon points="133,84 120,30 103,81" fill={C.earInner} />

      {/* 왼쪽 눈 */}
      <ellipse cx="81" cy="96" rx="11" ry="12" fill={C.eye} />
      <ellipse cx="81" cy="96" rx="4" ry="10" fill="#000" />
      <circle cx="77" cy="91" r="4" fill={C.shine} />

      {/* 오른쪽 눈 */}
      <ellipse cx="119" cy="96" rx="11" ry="12" fill={C.eye} />
      <ellipse cx="119" cy="96" rx="4" ry="10" fill="#000" />
      <circle cx="115" cy="91" r="4" fill={C.shine} />

      {/* 코 */}
      <path d="M97,115 L100,121 L103,115 Z" fill={C.nose} />

      {/* 입 */}
      <path
        d="M97,121 Q100,127 103,121"
        stroke={C.mouth}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* 왼쪽 수염 */}
      <line x1="76" y1="112" x2="36" y2="106" stroke={C.whisker} strokeWidth="1.2" />
      <line x1="76" y1="117" x2="36" y2="117" stroke={C.whisker} strokeWidth="1.2" />
      <line x1="76" y1="122" x2="36" y2="128" stroke={C.whisker} strokeWidth="1.2" />

      {/* 오른쪽 수염 */}
      <line x1="124" y1="112" x2="164" y2="106" stroke={C.whisker} strokeWidth="1.2" />
      <line x1="124" y1="117" x2="164" y2="117" stroke={C.whisker} strokeWidth="1.2" />
      <line x1="124" y1="122" x2="164" y2="128" stroke={C.whisker} strokeWidth="1.2" />
    </svg>
  );
}
