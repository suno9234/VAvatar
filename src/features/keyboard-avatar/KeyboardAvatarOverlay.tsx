import { useState, useRef, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { KeyHandMapper } from './KeyHandMapper';
import { useKeyboardEvents } from './hooks/useKeyboardEvents';
import { useConfigStore } from '../../store/configStore';
import { BongoCatAvatar } from './components/BongoCatAvatar';
import type { KeyEventPayload } from './types';

export function KeyboardAvatarOverlay() {
  const config = useConfigStore((s) => s.config);
  const mapperRef = useRef<KeyHandMapper>(new KeyHandMapper(config));
  const [leftPressed, setLeftPressed] = useState(false);
  const [rightPressed, setRightPressed] = useState(false);

  useEffect(() => {
    mapperRef.current.updateConfig(config);
  }, [config]);

  useEffect(() => {
    invoke('apply_overlay_no_activate').catch(() => {});
  }, []);

  const handleKeyEvent = useCallback((event: KeyEventPayload) => {
    const mapping = mapperRef.current.resolve(event.keyCode);
    if (!mapping) return;
    const down = event.eventType === 'keydown';
    if (mapping.hand === 'left') setLeftPressed(down);
    else if (mapping.hand === 'right') setRightPressed(down);
    else { setLeftPressed(down); setRightPressed(down); }
  }, []);

  useKeyboardEvents(handleKeyEvent);

  return (
    // 테두리 영역 (패딩) 드래그 가능
    <div
      onMouseDown={() => getCurrentWebviewWindow().startDragging().catch(() => {})}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        cursor: 'grab',
        padding: 12,
        boxSizing: 'border-box',
      }}
    >
      {/* 고양이 영역 — 클릭해도 드래그 시작 안 됨 */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{ cursor: 'default', width: '100%' }}
      >
        <BongoCatAvatar
          leftPressed={leftPressed}
          rightPressed={rightPressed}
          sprites={config.sprites ?? { body: '/sprites/default/body.svg', leftArmUp: '/sprites/default/left-up.svg', leftArmDown: '/sprites/default/left-down.svg', rightArmUp: '/sprites/default/right-up.svg', rightArmDown: '/sprites/default/right-down.svg' }}
        />
      </div>
    </div>
  );
}
