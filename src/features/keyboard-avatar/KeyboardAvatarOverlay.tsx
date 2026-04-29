import { useState, useRef, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { listen } from '@tauri-apps/api/event';
import { KeyHandMapper } from './KeyHandMapper';
import { useKeyboardEvents } from './hooks/useKeyboardEvents';
import { useConfigStore, DEFAULT_SPRITES, DEFAULT_CAT_LAYOUT } from '../../store/configStore';
import { KeyboardDisplay } from './components/KeyboardDisplay';
import type { KeyEventPayload } from './types';

const absFullStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  userSelect: 'none',
  pointerEvents: 'none',
};

export function KeyboardAvatarOverlay() {
  const config = useConfigStore((s) => s.config);
  const keyboardLayout = useConfigStore((s) => s.keyboardLayout);
  const updateKeyboardLayout = useConfigStore((s) => s.updateKeyboardLayout);
  const catLayout = useConfigStore((s) => s.catLayout ?? DEFAULT_CAT_LAYOUT);
  const updateCatLayout = useConfigStore((s) => s.updateCatLayout);
  const mapperRef = useRef<KeyHandMapper>(new KeyHandMapper(config));
  const [leftPressed, setLeftPressed] = useState(false);
  const [rightPressed, setRightPressed] = useState(false);
  const [mouseMoving, setMouseMoving] = useState(false);
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());

  // 마우스 방향 팔 이동 — rAF decay, re-render 없이 DOM 직접 조작
  const rightArmRef = useRef<HTMLImageElement>(null);
  const armOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const MAX_RIGHT = 14;
    const MAX_LEFT = 3;
    const MAX_DOWN = 6;
    const SCALE = 0.18;
    const DECAY = 0.82;

    const unlistenDelta = listen<[number, number]>('mouse-delta', (e) => {
      const [dx, dy] = e.payload;
      armOffset.current = {
        x: Math.max(-MAX_LEFT, Math.min(MAX_RIGHT, armOffset.current.x + dx * SCALE)),
        y: Math.max(-MAX_RIGHT, Math.min(MAX_DOWN, armOffset.current.y + dy * SCALE)),
      };
      setMouseMoving(true);
    });
    const unlistenStop = listen<null>('mouse-stop', () => setMouseMoving(false));

    let raf: number;
    const animate = () => {
      const o = armOffset.current;
      if (Math.abs(o.x) > 0.1 || Math.abs(o.y) > 0.1) {
        armOffset.current = { x: o.x * DECAY, y: o.y * DECAY };
        if (rightArmRef.current) {
          rightArmRef.current.style.transform = `translate(${armOffset.current.x}px, ${armOffset.current.y}px)`;
        }
      } else if (o.x !== 0 || o.y !== 0) {
        armOffset.current = { x: 0, y: 0 };
        if (rightArmRef.current) rightArmRef.current.style.transform = '';
      }
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      unlistenDelta.then(fn => fn());
      unlistenStop.then(fn => fn());
    };
  }, []);

  // 설정창 열림 여부 — 편집 모드 제어
  const [editMode, setEditMode] = useState(false);

  const outerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(400);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // 마운트 시 Rust config에서 레이아웃 로드
  useEffect(() => {
    invoke<[{ x: number; y: number }, { x: number; y: number; rotation: number }]>('get_layout')
      .then(([cat, keyboard]) => {
        updateCatLayout(cat);
        updateKeyboardLayout(keyboard);
      })
      .catch(() => {});
  }, []);

  // 설정창 열림/닫힘 이벤트 수신
  useEffect(() => {
    const unlistenPromise = listen<boolean>('settings-mode', (e) => {
      setEditMode(e.payload);
      if (!e.payload) {
        // 편집 모드 종료 시 현재 레이아웃을 Rust config에 저장
        const cat = catLayoutRef.current;
        const kbd = layoutRef.current;
        invoke('save_layout', {
          cat: { x: cat.x, y: cat.y },
          keyboard: { x: kbd.x, y: kbd.y, rotation: kbd.rotation },
        }).catch(() => {});
      }
    });
    return () => { unlistenPromise.then((fn) => fn()); };
  }, []);


  const dragging = useRef(false);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, layoutX: 0, layoutY: 0 });
  const layoutRef = useRef(keyboardLayout);
  useEffect(() => { layoutRef.current = keyboardLayout; }, [keyboardLayout]);

  const catDragging = useRef(false);
  const catDragStart = useRef({ mouseX: 0, mouseY: 0, layoutX: 0, layoutY: 0 });
  const catLayoutRef = useRef(catLayout);
  useEffect(() => { catLayoutRef.current = catLayout; }, [catLayout]);

  useEffect(() => {
    mapperRef.current.updateConfig(config);
  }, [config]);

  useEffect(() => {
    invoke('apply_overlay_no_activate').catch(() => {});
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragging.current) {
        const outer = outerRef.current;
        if (!outer) return;
        const rect = outer.getBoundingClientRect();
        const dx = (e.clientX - dragStart.current.mouseX) / rect.width;
        const dy = (e.clientY - dragStart.current.mouseY) / rect.height;
        updateKeyboardLayout({
          x: dragStart.current.layoutX + dx,
          y: dragStart.current.layoutY + dy,
          rotation: layoutRef.current.rotation,
        });
      }
      if (catDragging.current) {
        const outer = outerRef.current;
        if (!outer) return;
        const rect = outer.getBoundingClientRect();
        const dx = (e.clientX - catDragStart.current.mouseX) / rect.width;
        const dy = (e.clientY - catDragStart.current.mouseY) / rect.height;
        updateCatLayout({
          x: catDragStart.current.layoutX + dx,
          y: catDragStart.current.layoutY + dy,
        });
      }
    };
    const onUp = () => { dragging.current = false; catDragging.current = false; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [updateKeyboardLayout, updateCatLayout]);

  // 고양이 스프라이트 드래그 — 편집 모드에서만 작동, 창 드래그 차단
  const handleCatMouseDown = (e: React.MouseEvent) => {
    if (!editMode) return;
    e.stopPropagation();
    catDragging.current = true;
    catDragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      layoutX: catLayoutRef.current.x,
      layoutY: catLayoutRef.current.y,
    };
  };

  // 키보드 드래그 — 편집 모드에서만 작동
  const handleKeyboardMouseDown = (e: React.MouseEvent) => {
    if (!editMode) return;
    e.stopPropagation();
    dragging.current = true;
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      layoutX: layoutRef.current.x,
      layoutY: layoutRef.current.y,
    };
  };

  const handleKeyboardWheel = (e: React.WheelEvent) => {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    updateKeyboardLayout({
      ...layoutRef.current,
      rotation: layoutRef.current.rotation + (e.deltaY > 0 ? 5 : -5),
    });
  };

  const handleKeyEvent = useCallback((event: KeyEventPayload) => {
    const down = event.eventType === 'keydown';

    setPressedKeys((prev) => {
      const next = new Set(prev);
      if (down) next.add(event.keyCode);
      else next.delete(event.keyCode);
      return next;
    });

    const mapping = mapperRef.current.resolve(event.keyCode);
    if (!mapping) return;
    if (mapping.hand === 'left') setLeftPressed(down);
    else if (mapping.hand === 'right') setRightPressed(down);
    else { setLeftPressed(down); setRightPressed(down); }
  }, []);

  useKeyboardEvents(handleKeyEvent);

  const scale = containerWidth / 400;
  const sprites = config.sprites ?? DEFAULT_SPRITES;

  return (
    <div
      ref={outerRef}
      onMouseDown={() => {
        // 편집 모드에서만 창 드래그
        if (editMode) getCurrentWebviewWindow().startDragging().catch(() => {});
      }}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: 'transparent',
        cursor: editMode ? 'grab' : 'default',
        padding: 12,
        boxSizing: 'border-box',
        // 편집 모드 표시 — 얇은 파란 테두리
        outline: editMode ? '2px dashed rgba(74,158,255,0.7)' : 'none',
        outlineOffset: '-2px',
      }}
    >
      {/* 편집 모드 레이블 */}
      {editMode && (
        <div style={{
          position: 'absolute',
          top: 4,
          left: 4,
          fontSize: 9,
          color: 'rgba(74,158,255,0.9)',
          fontFamily: 'monospace',
          fontWeight: 700,
          userSelect: 'none',
          pointerEvents: 'none',
          zIndex: 10,
        }}>
          EDIT
        </div>
      )}

      {/* 스프라이트 컨테이너 — 편집 모드에서 드래그로 위치 조정 */}
      <div
        ref={containerRef}
        onMouseDown={handleCatMouseDown}
        style={{
          position: 'absolute',
          left: `${catLayout.x * 100}%`,
          top: `${catLayout.y * 100}%`,
          width: '100%',
          aspectRatio: '400 / 320',
          cursor: editMode ? 'grab' : 'default',
        }}
      >
        <img src={sprites.body} alt="" style={{ ...absFullStyle, zIndex: 1 }} draggable={false} />
        <img
          src={leftPressed ? sprites.leftArmDown : sprites.leftArmUp}
          alt=""
          style={{ ...absFullStyle, zIndex: 3 }}
          draggable={false}
        />
        <img
          ref={rightArmRef}
          src={rightPressed ? sprites.rightArmDown : mouseMoving ? sprites.mouse : sprites.rightArmUp}
          alt=""
          style={{ ...absFullStyle, zIndex: 3, left: mouseMoving && !rightPressed ? `${-50 * scale}px` : 0 }}
          draggable={false}
        />
      </div>

      {/* 키보드 디스플레이 */}
      <div
        onMouseDown={handleKeyboardMouseDown}
        onWheel={handleKeyboardWheel}
        style={{
          position: 'absolute',
          left: `${keyboardLayout.x * 100}%`,
          top: `${keyboardLayout.y * 100}%`,
          transform: `rotate(${keyboardLayout.rotation}deg) scale(${scale})`,
          transformOrigin: 'top left',
          cursor: editMode ? 'move' : 'default',
          zIndex: 2,
        }}
      >
        <KeyboardDisplay pressedKeys={pressedKeys} />
      </div>
    </div>
  );
}
