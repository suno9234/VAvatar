import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { KeyMappingConfig, HandMapping } from '../features/keyboard-avatar/types';

export interface SpriteSet {
  body: string;
  leftArmUp: string;
  leftArmDown: string;
  rightArmUp: string;
  rightArmDown: string;
}

export const DEFAULT_SPRITES: SpriteSet = {
  body:         '/sprites/default/body.png',
  leftArmUp:    '/sprites/default/left-up.png',
  leftArmDown:  '/sprites/default/left-down.png',
  rightArmUp:   '/sprites/default/right-up.png',
  rightArmDown: '/sprites/default/right-down.png',
};

// QWERTY 기본 키-손 매핑
const DEFAULT_MAPPINGS: Record<string, HandMapping> = {
  // 왼손 영역
  KeyQ: { hand: 'left', parameterGroup: 'ArmL_Typing', intensity: 0.8 },
  KeyW: { hand: 'left', parameterGroup: 'ArmL_Typing', intensity: 0.8 },
  KeyE: { hand: 'left', parameterGroup: 'ArmL_Typing', intensity: 0.8 },
  KeyR: { hand: 'left', parameterGroup: 'ArmL_Typing', intensity: 0.8 },
  KeyT: { hand: 'left', parameterGroup: 'ArmL_Typing', intensity: 0.8 },
  KeyA: { hand: 'left', parameterGroup: 'ArmL_Typing', intensity: 0.8 },
  KeyS: { hand: 'left', parameterGroup: 'ArmL_Typing', intensity: 0.8 },
  KeyD: { hand: 'left', parameterGroup: 'ArmL_Typing', intensity: 0.8 },
  KeyF: { hand: 'left', parameterGroup: 'ArmL_Typing', intensity: 0.8 },
  KeyG: { hand: 'left', parameterGroup: 'ArmL_Typing', intensity: 0.8 },
  KeyZ: { hand: 'left', parameterGroup: 'ArmL_Typing', intensity: 0.8 },
  KeyX: { hand: 'left', parameterGroup: 'ArmL_Typing', intensity: 0.8 },
  KeyC: { hand: 'left', parameterGroup: 'ArmL_Typing', intensity: 0.8 },
  KeyV: { hand: 'left', parameterGroup: 'ArmL_Typing', intensity: 0.8 },
  KeyB: { hand: 'left', parameterGroup: 'ArmL_Typing', intensity: 0.8 },
  Digit1: { hand: 'left', parameterGroup: 'ArmL_Typing', intensity: 0.8 },
  Digit2: { hand: 'left', parameterGroup: 'ArmL_Typing', intensity: 0.8 },
  Digit3: { hand: 'left', parameterGroup: 'ArmL_Typing', intensity: 0.8 },
  Digit4: { hand: 'left', parameterGroup: 'ArmL_Typing', intensity: 0.8 },
  Digit5: { hand: 'left', parameterGroup: 'ArmL_Typing', intensity: 0.8 },
  Tab: { hand: 'left', parameterGroup: 'ArmL_Typing', intensity: 0.7 },
  CapsLock: { hand: 'left', parameterGroup: 'ArmL_Typing', intensity: 0.7 },
  ShiftLeft: { hand: 'left', parameterGroup: 'ArmL_Typing', intensity: 0.7 },
  ControlLeft: { hand: 'left', parameterGroup: 'ArmL_Typing', intensity: 0.7 },
  // 오른손 영역
  KeyY: { hand: 'right', parameterGroup: 'ArmR_Typing', intensity: 0.8 },
  KeyU: { hand: 'right', parameterGroup: 'ArmR_Typing', intensity: 0.8 },
  KeyI: { hand: 'right', parameterGroup: 'ArmR_Typing', intensity: 0.8 },
  KeyO: { hand: 'right', parameterGroup: 'ArmR_Typing', intensity: 0.8 },
  KeyP: { hand: 'right', parameterGroup: 'ArmR_Typing', intensity: 0.8 },
  KeyH: { hand: 'right', parameterGroup: 'ArmR_Typing', intensity: 0.8 },
  KeyJ: { hand: 'right', parameterGroup: 'ArmR_Typing', intensity: 0.8 },
  KeyK: { hand: 'right', parameterGroup: 'ArmR_Typing', intensity: 0.8 },
  KeyL: { hand: 'right', parameterGroup: 'ArmR_Typing', intensity: 0.8 },
  KeyN: { hand: 'right', parameterGroup: 'ArmR_Typing', intensity: 0.8 },
  KeyM: { hand: 'right', parameterGroup: 'ArmR_Typing', intensity: 0.8 },
  Digit6: { hand: 'right', parameterGroup: 'ArmR_Typing', intensity: 0.8 },
  Digit7: { hand: 'right', parameterGroup: 'ArmR_Typing', intensity: 0.8 },
  Digit8: { hand: 'right', parameterGroup: 'ArmR_Typing', intensity: 0.8 },
  Digit9: { hand: 'right', parameterGroup: 'ArmR_Typing', intensity: 0.8 },
  Digit0: { hand: 'right', parameterGroup: 'ArmR_Typing', intensity: 0.8 },
  Enter: { hand: 'right', parameterGroup: 'ArmR_Typing', intensity: 0.7 },
  Backspace: { hand: 'right', parameterGroup: 'ArmR_Typing', intensity: 0.7 },
  ShiftRight: { hand: 'right', parameterGroup: 'ArmR_Typing', intensity: 0.7 },
  ControlRight: { hand: 'right', parameterGroup: 'ArmR_Typing', intensity: 0.7 },
  // 양손
  Space: { hand: 'both', parameterGroup: 'ArmBoth_Typing', intensity: 0.6 },
};

export const DEFAULT_CONFIG: KeyMappingConfig = {
  version: '1.0.0',
  mappings: DEFAULT_MAPPINGS,
  idleTimeoutMs: 150,
  interpolationDurationMs: 80,
  modelPath: '/models/default/default.model3.json',
  sprites: DEFAULT_SPRITES,
};

interface ConfigStoreState {
  config: KeyMappingConfig;
  loadError: string | null;
  updateMapping: (keyCode: string, mapping: HandMapping) => void;
  resetMappings: () => void;
  setLoadError: (error: string | null) => void;
  updateSprite: (slot: keyof SpriteSet, value: string) => void;
  resetSprites: () => void;
}

export const useConfigStore = create<ConfigStoreState>()(
  persist(
    (set) => ({
      config: DEFAULT_CONFIG,
      loadError: null,
      updateMapping: (keyCode, mapping) =>
        set((state) => ({
          config: {
            ...state.config,
            mappings: { ...state.config.mappings, [keyCode]: mapping },
          },
        })),
      resetMappings: () =>
        set((state) => ({
          config: { ...state.config, mappings: DEFAULT_MAPPINGS },
        })),
      setLoadError: (error) => set({ loadError: error }),
      updateSprite: (slot, value) =>
        set((state) => ({
          config: {
            ...state.config,
            sprites: { ...state.config.sprites, [slot]: value },
          },
        })),
      resetSprites: () =>
        set((state) => ({
          config: { ...state.config, sprites: DEFAULT_SPRITES },
        })),
    }),
    { name: 'avatar-key-mapping' }
  )
);
