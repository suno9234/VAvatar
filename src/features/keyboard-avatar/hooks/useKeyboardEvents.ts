import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import type { KeyEventPayload } from '../types';

type KeyEventHandler = (event: KeyEventPayload) => void;

export function useKeyboardEvents(onKeyEvent: KeyEventHandler) {
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const setup = async () => {
      try {
        await invoke('frontend_ready');
        console.log('[useKeyboardEvents] frontend_ready 전송 완료');
      } catch (e) {
        console.warn('[useKeyboardEvents] frontend_ready 실패:', e);
      }

      const unlistenFn = await listen<KeyEventPayload>('keyboard-event', (event) => {
        console.log('[useKeyboardEvents] 이벤트 수신:', event.payload);
        onKeyEvent(event.payload);
      });

      console.log('[useKeyboardEvents] keyboard-event 구독 완료');
      unlisten = unlistenFn;
    };

    setup();

    return () => {
      unlisten?.();
    };
  }, [onKeyEvent]);
}
