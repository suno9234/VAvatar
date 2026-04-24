// Tauri IPC로 Rust에서 전달받는 키 이벤트 페이로드
export interface KeyEventPayload {
  keyCode: string;        // "KeyA", "Space", "ArrowLeft"
  eventType: 'keydown' | 'keyup';
  timestamp: number;      // Unix ms
}

export type HandSide = 'left' | 'right' | 'both';

export type AnimationPhase = 'idle' | 'pressing' | 'releasing';

// KeyHandMapper.resolve() 반환값
export interface HandMapping {
  hand: HandSide;
  parameterGroup: string; // "ArmL_Typing" | "ArmR_Typing" | "ArmBoth_Typing"
  intensity: number;      // 0.0 ~ 1.0
}

// 손별 애니메이션 상태
export interface HandAnimationState {
  phase: AnimationPhase;
  targetParameters: Record<string, number>;
  currentParameters: Record<string, number>;
  startTime: number;
  duration: number;       // 보간 지속 시간 (ms)
}

// key-mapping.json 구조
export interface KeyMappingConfig {
  version: string;
  mappings: Record<string, HandMapping>; // keyCode → HandMapping
  idleTimeoutMs: number;           // 기본: 150
  interpolationDurationMs: number; // 기본: 80
  modelPath: string;               // Live2D .model3.json 경로
  sprites: import('../../store/configStore').SpriteSet;
}
