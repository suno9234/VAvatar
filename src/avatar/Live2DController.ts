import type { Application, DisplayObject } from 'pixi.js';

export class Live2DController {
  // pixi-live2d-display는 Cubism SDK가 없으면 import 시점에 크래시하므로
  // loadModel 호출 시점에 동적 import 사용
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private model: any = null;
  private app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  async loadModel(modelPath: string): Promise<void> {
    if (this.model) {
      this.app.stage.removeChild(this.model as unknown as DisplayObject);
      this.model.destroy();
      this.model = null;
    }

    let Live2DModel;
    try {
      ({ Live2DModel } = await import('pixi-live2d-display'));
    } catch (e) {
      console.error('[Live2DController] pixi-live2d-display 로드 실패 (Cubism SDK 미설치?):', e);
      return;
    }

    try {
      const model = await Live2DModel.from(modelPath);
      model.anchor.set(0.5, 0.5);
      model.x = this.app.screen.width / 2;
      model.y = this.app.screen.height / 2;

      const scale = Math.min(
        this.app.screen.width / model.width,
        this.app.screen.height / model.height
      ) * 0.9;
      model.scale.set(scale);

      this.app.stage.addChild(model as unknown as DisplayObject);
      this.model = model;
    } catch (e) {
      console.error(`[Live2DController] 모델 로드 실패 (${modelPath}):`, e);
      throw new Error(`Live2D 모델을 불러올 수 없습니다: ${modelPath}`);
    }
  }

  setParameter(parameterId: string, value: number) {
    if (!this.model) return;
    try {
      this.model.internalModel.coreModel.setParameterValueById(parameterId, value);
    } catch {
      // 모델이 해당 파라미터를 지원하지 않으면 무시
    }
  }

  onResize(width: number, height: number) {
    if (!this.model) return;
    this.model.x = width / 2;
    this.model.y = height / 2;
    const scale = Math.min(width / this.model.width, height / this.model.height) * 0.9;
    this.model.scale.set(scale);
  }

  isLoaded(): boolean {
    return this.model !== null;
  }

  destroy() {
    if (this.model) {
      this.app.stage.removeChild(this.model as unknown as DisplayObject);
      this.model.destroy();
      this.model = null;
    }
  }
}
