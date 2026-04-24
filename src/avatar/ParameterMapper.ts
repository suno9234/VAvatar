// parameterGroup → Live2D 파라미터 ID 변환
// 실제 모델 파라미터 ID는 모델마다 다르므로 JSON 설정으로 오버라이드 가능

const DEFAULT_PARAMETER_MAP: Record<string, string[]> = {
  ArmL_Typing: ['ParamArmLA', 'ParamArmLB'],
  ArmR_Typing: ['ParamArmRA', 'ParamArmRB'],
  ArmBoth_Typing: ['ParamArmLA', 'ParamArmLB', 'ParamArmRA', 'ParamArmRB'],
};

export class ParameterMapper {
  private map: Record<string, string[]>;

  constructor(customMap?: Record<string, string[]>) {
    this.map = customMap ?? DEFAULT_PARAMETER_MAP;
  }

  // parameterGroup → Live2D 파라미터 ID 배열
  resolve(parameterGroup: string): string[] {
    const ids = this.map[parameterGroup];
    if (!ids) {
      console.warn(`[ParameterMapper] 알 수 없는 parameterGroup: ${parameterGroup}`);
      return [];
    }
    return ids;
  }

  updateMap(customMap: Record<string, string[]>) {
    this.map = { ...DEFAULT_PARAMETER_MAP, ...customMap };
  }
}
