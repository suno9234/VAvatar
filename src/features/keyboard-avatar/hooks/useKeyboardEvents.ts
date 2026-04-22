import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import type { KeyEventPayload } from '../types';

type KeyEventHandler = (event: KeyEventPayload) => void;

export function useKeyboardEvents(onKeyEvent: KeyEventHandler) {
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const setup = async () => {
      // Rust 백엔드에 프론트엔드 준비 완료 신호 전송
      try {
        await invoke('frontend_ready');
      } catch {
        // frontend_ready 커맨드가 없으면 무시 (Task 5 구현 전)
      }

      // keyboard-event 채널 구독
      const unlistenFn = await listen<KeyEventPayload>('keyboard-event', (event) => {
        onKeyEvent(event.payload);
      });

      unlisten = unlistenFn;
    };

    setup();

    return () => {
      unlisten?.();
    };
  }, [onKeyEvent]);
}
