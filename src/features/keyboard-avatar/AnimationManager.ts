import type { HandSide, HandAnimationState, HandMapping } from './types';

// easing 함수
function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}
function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

interface AnimationManagerOptions {
  idleTimeoutMs?: number;
  interpolationDurationMs?: number;
}

export class AnimationManager {
  private states: Map<HandSide, HandAnimationState> = new Map();
  private idleTimers: Map<HandSide, ReturnType<typeof setTimeout>> = new Map();
  private idleTimeoutMs: number;
  private interpolationDurationMs: number;

  constructor(options: AnimationManagerOptions = {}) {
    this.idleTimeoutMs = options.idleTimeoutMs ?? 150;
    this.interpolationDurationMs = options.interpolationDurationMs ?? 80;

    // 초기 idle 상태
    for (const hand of ['left', 'right', 'both'] as HandSide[]) {
      this.states.set(hand, this.createIdleState());
    }
  }

  private createIdleState(): HandAnimationState {
    return {
      phase: 'idle',
      targetParameters: {},
      currentParameters: {},
      startTime: 0,
      duration: this.interpolationDurationMs,
    };
  }

  handleKeyDown(mapping: HandMapping) {
    const { hand, parameterGroup, intensity } = mapping;
    const state = this.states.get(hand)!;

    // idle 복귀 타이머 취소
    const timer = this.idleTimers.get(hand);
    if (timer) {
      clearTimeout(timer);
      this.idleTimers.delete(hand);
    }

    // 현재 보간 값에서 즉시 새 목표로 전환
    const newState: HandAnimationState = {
      phase: 'pressing',
      targetParameters: { [parameterGroup]: intensity },
      currentParameters: { ...state.currentParameters },
      startTime: performance.now(),
      duration: this.interpolationDurationMs,
    };

    this.states.set(hand, newState);
  }

  handleKeyUp(hand: HandSide) {
    const state = this.states.get(hand)!;

    const releasingState: HandAnimationState = {
      phase: 'releasing',
      targetParameters: {},
      currentParameters: { ...state.currentParameters },
      startTime: performance.now(),
      duration: this.interpolationDurationMs,
    };
    this.states.set(hand, releasingState);

    // idle 타임아웃 후 idle 상태로 복귀
    const timer = setTimeout(() => {
      this.states.set(hand, this.createIdleState());
      this.idleTimers.delete(hand);
    }, this.idleTimeoutMs);
    this.idleTimers.set(hand, timer);
  }

  // PixiJS Ticker에서 매 프레임 호출
  tick(_deltaMs: number): Map<string, number> {
    const result = new Map<string, number>();
    const now = performance.now();

    for (const [, state] of this.states) {
      if (state.phase === 'idle') continue;

      const elapsed = now - state.startTime;
      const t = Math.min(elapsed / state.duration, 1);
      const easedT = state.phase === 'pressing' ? easeOutQuart(t) : easeInOutSine(t);

      for (const [paramId, targetVal] of Object.entries(state.targetParameters)) {
        const fromVal = state.currentParameters[paramId] ?? 0;
        const current = fromVal + (targetVal - fromVal) * easedT;
        state.currentParameters[paramId] = current;
        result.set(paramId, current);
      }

      // releasing 중 파라미터 → 0으로 수렴
      if (state.phase === 'releasing') {
        for (const [paramId, fromVal] of Object.entries(state.currentParameters)) {
          if (!(paramId in state.targetParameters)) {
            const current = fromVal * (1 - easedT);
            state.currentParameters[paramId] = current;
            result.set(paramId, current);
          }
        }
      }
    }

    return result;
  }

  destroy() {
    for (const timer of this.idleTimers.values()) {
      clearTimeout(timer);
    }
    this.idleTimers.clear();
  }
}
