import { Application } from 'pixi.js';
import { Live2DController } from './Live2DController';
import { ParameterMapper } from './ParameterMapper';
import { AnimationManager } from '../features/keyboard-avatar/AnimationManager';

interface PixiRendererOptions {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

export class PixiRenderer {
  app: Application;
  live2d: Live2DController;
  paramMapper: ParameterMapper;
  private animationManager: AnimationManager | null = null;
  private rafId: number | null = null;
  private lastTime = 0;

  constructor({ canvas, width, height }: PixiRendererOptions) {
    this.app = new Application({
      view: canvas,
      width,
      height,
      backgroundAlpha: 0,   // 투명 배경 (OBS 브라우저 소스용)
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
      forceCanvas: true,    // WebView2 WebGL 셰이더 초기화 오류 회피
    });

    this.live2d = new Live2DController(this.app);
    this.paramMapper = new ParameterMapper();
  }

  setAnimationManager(manager: AnimationManager) {
    this.animationManager = manager;
  }

  start() {
    const loop = (time: number) => {
      const deltaMs = time - this.lastTime;
      this.lastTime = time;

      if (this.animationManager) {
        const params = this.animationManager.tick(deltaMs);
        // AnimationManager 결과(paramGroup → value)를
        // Live2D 파라미터 ID로 변환해 적용
        for (const [groupOrId, value] of params) {
          const ids = this.paramMapper.resolve(groupOrId);
          if (ids.length > 0) {
            for (const id of ids) {
              this.live2d.setParameter(id, value);
            }
          } else {
            // parameterGroup이 아닌 직접 ID인 경우
            this.live2d.setParameter(groupOrId, value);
          }
        }
      }

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  resize(width: number, height: number) {
    this.app.renderer.resize(width, height);
    this.live2d.onResize(width, height);
  }

  destroy() {
    this.stop();
    this.animationManager?.destroy();
    this.live2d.destroy();
    this.app.destroy(false);
  }
}
