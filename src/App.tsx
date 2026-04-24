import { KeyboardAvatarOverlay } from './features/keyboard-avatar/KeyboardAvatarOverlay';
import { SettingsManager } from './features/keyboard-avatar/components/SettingsManager';
import { ErrorBoundary } from './components/ErrorBoundary';

function getWindowLabel(): string | null {
  try {
    // Tauri 환경에서만 존재하는 내부 메타데이터로 창 레이블 확인
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).__TAURI_INTERNALS__?.metadata?.currentWindow?.label ?? null;
  } catch {
    return null;
  }
}

function isOverlayView(): boolean {
  const label = getWindowLabel();
  if (label !== null) return label === 'overlay';
  // OBS 브라우저 소스: URL 해시로 판단
  return window.location.hash === '#/overlay';
}

function App() {
  if (isOverlayView()) {
    return (
      <div style={{ width: '100%', height: '100%', overflow: 'hidden', background: 'transparent' }}>
        <ErrorBoundary fallback={
          <div style={{ color: '#f44336', padding: 16, fontFamily: 'monospace', fontSize: 12 }}>
            오버레이 초기화 실패
          </div>
        }>
          <KeyboardAvatarOverlay />
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#121212' }}>
      <nav style={{
        display: 'flex', alignItems: 'center',
        padding: '10px 20px', backgroundColor: '#1a1a1a',
        borderBottom: '1px solid #2a2a2a',
      }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Avatar 설정</span>
        <span style={{ marginLeft: 'auto', color: '#666', fontSize: 12 }}>
          OBS 브라우저 소스: http://localhost:1420/#/overlay
        </span>
      </nav>
      <SettingsManager />
    </div>
  );
}

export default App;
