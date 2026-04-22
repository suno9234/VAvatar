import type { HandMapping, KeyMappingConfig } from './types';
import { DEFAULT_CONFIG } from '../../store/configStore';

export class KeyHandMapper {
  private config: KeyMappingConfig;

  constructor(config: KeyMappingConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  // keyCode → HandMapping 반환. 매핑 없으면 null
  resolve(keyCode: string): HandMapping | null {
    return this.config.mappings[keyCode] ?? null;
  }

  updateConfig(config: KeyMappingConfig) {
    this.config = config;
  }
}
