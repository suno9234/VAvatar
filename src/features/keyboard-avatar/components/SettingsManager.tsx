import { useRef, useState } from 'react';
import { useConfigStore, DEFAULT_SPRITES } from '../../../store/configStore';
import type { SpriteSet } from '../../../store/configStore';
import { KeyboardVisualizer } from './KeyboardVisualizer';
import type { HandSide, HandMapping } from '../types';

const HAND_OPTIONS: { value: HandSide; label: string }[] = [
  { value: 'left', label: '왼손' },
  { value: 'right', label: '오른손' },
  { value: 'both', label: '양손' },
];

const PARAM_GROUP_OPTIONS: { value: string; label: string }[] = [
  { value: 'ArmL_Typing', label: 'ArmL_Typing (왼팔)' },
  { value: 'ArmR_Typing', label: 'ArmR_Typing (오른팔)' },
  { value: 'ArmBoth_Typing', label: 'ArmBoth_Typing (양팔)' },
];

const SPRITE_SLOTS: { key: keyof SpriteSet; label: string }[] = [
  { key: 'body',        label: '바디' },
  { key: 'leftArmUp',  label: '왼팔 (올림)' },
  { key: 'leftArmDown',label: '왼팔 (내림)' },
  { key: 'rightArmUp', label: '오른팔 (올림)' },
  { key: 'rightArmDown',label: '오른팔 (내림)' },
];

function SpriteSlot({ slotKey, label }: { slotKey: keyof SpriteSet; label: string }) {
  const { config, updateSprite } = useConfigStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const src = config.sprites?.[slotKey] ?? DEFAULT_SPRITES[slotKey];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => updateSprite(slotKey, ev.target?.result as string);
    reader.readAsDataURL(file);
    // input 초기화 (같은 파일 재선택 허용)
    e.target.value = '';
  };

  return (
    <div style={{ border: '1px solid #333', borderRadius: 6, padding: 8 }}>
      <div style={{ fontSize: 12, color: '#aaa', marginBottom: 6 }}>{label}</div>
      <div style={{ background: '#111', borderRadius: 4, overflow: 'hidden', height: 72 }}>
        <img
          src={src}
          alt={label}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/webp,image/svg+xml,image/jpeg,image/gif"
          style={{ display: 'none' }}
          onChange={handleChange}
        />
        <button onClick={() => fileRef.current?.click()} style={smallBtnStyle}>변경</button>
        <button onClick={() => updateSprite(slotKey, DEFAULT_SPRITES[slotKey])} style={smallBtnStyle}>
          초기화
        </button>
      </div>
    </div>
  );
}

export function SettingsManager() {
  const { config, updateMapping, resetMappings, resetSprites } = useConfigStore();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<HandMapping | null>(null);

  const handleEdit = (keyCode: string) => {
    const mapping = config.mappings[keyCode];
    if (!mapping) return;
    setEditingKey(keyCode);
    setEditForm({ ...mapping });
  };

  // 키 매핑은 Zustand persist 미들웨어가 localStorage에 자동 저장
  const handleSave = () => {
    if (!editingKey || !editForm) return;
    updateMapping(editingKey, editForm);
    setEditingKey(null);
    setEditForm(null);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleReset = () => {
    if (!confirm('기본 키-손 매핑으로 초기화하시겠습니까?')) return;
    resetMappings();
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const mappingEntries = Object.entries(config.mappings).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div style={{ padding: 16, color: '#e0e0e0', fontFamily: 'sans-serif' }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>키보드 아바타 설정</h2>

      {/* 스프라이트 설정 */}
      <section style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 14, color: '#aaa' }}>봉고캣 스프라이트</h3>
          <button onClick={resetSprites} style={secondaryBtnStyle}>전체 초기화</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {SPRITE_SLOTS.map(({ key, label }) => (
            <SpriteSlot key={key} slotKey={key} label={label} />
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#aaa' }}>키-손 매핑 시각화</h3>
        <KeyboardVisualizer activeKey={editingKey ?? undefined} />
      </section>

      <section style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 14, color: '#aaa' }}>매핑 목록</h3>
          <button
            onClick={handleReset}
            style={secondaryBtnStyle}
          >
            기본값으로 초기화
          </button>
          {saveStatus === 'saved' && <span style={{ color: '#4caf50', fontSize: 13 }}>저장됨</span>}
        </div>

        <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid #333', borderRadius: 6 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ backgroundColor: '#1e1e1e', position: 'sticky', top: 0 }}>
                <Th>키 코드</Th>
                <Th>손</Th>
                <Th>파라미터 그룹</Th>
                <Th>강도</Th>
                <Th>편집</Th>
              </tr>
            </thead>
            <tbody>
              {mappingEntries.map(([keyCode, mapping]) => (
                <tr
                  key={keyCode}
                  style={{ borderBottom: '1px solid #2a2a2a', backgroundColor: editingKey === keyCode ? '#1a2a3a' : undefined }}
                >
                  <Td mono>{keyCode}</Td>
                  <Td>{mapping.hand === 'left' ? '왼손' : mapping.hand === 'right' ? '오른손' : '양손'}</Td>
                  <Td mono>{mapping.parameterGroup}</Td>
                  <Td>{(mapping.intensity * 100).toFixed(0)}%</Td>
                  <Td>
                    <button onClick={() => handleEdit(keyCode)} style={editBtnStyle}>
                      편집
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 인라인 편집 패널 */}
      {editingKey && editForm && (
        <section style={{ padding: 16, border: '1px solid #4a9eff', borderRadius: 8, backgroundColor: '#0d1b2a' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>
            편집 중: <code style={{ backgroundColor: '#1e1e1e', padding: '2px 6px', borderRadius: 3 }}>{editingKey}</code>
          </h3>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <label style={labelStyle}>
              손
              <select
                value={editForm.hand}
                onChange={(e) => setEditForm({ ...editForm, hand: e.target.value as HandSide })}
                style={selectStyle}
              >
                {HAND_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>

            <label style={labelStyle}>
              파라미터 그룹
              <select
                value={editForm.parameterGroup}
                onChange={(e) => setEditForm({ ...editForm, parameterGroup: e.target.value })}
                style={selectStyle}
              >
                {PARAM_GROUP_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>

            <label style={labelStyle}>
              강도 ({(editForm.intensity * 100).toFixed(0)}%)
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={editForm.intensity}
                onChange={(e) => setEditForm({ ...editForm, intensity: parseFloat(e.target.value) })}
                style={{ width: 120, marginTop: 6 }}
              />
            </label>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={handleSave} style={primaryBtnStyle}>저장</button>
            <button onClick={() => { setEditingKey(null); setEditForm(null); }} style={secondaryBtnStyle}>
              취소
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

// 스타일 헬퍼
const Th = ({ children }: { children: React.ReactNode }) => (
  <th style={{ padding: '8px 12px', textAlign: 'left', color: '#aaa', fontWeight: 600 }}>{children}</th>
);
const Td = ({ children, mono }: { children: React.ReactNode; mono?: boolean }) => (
  <td style={{ padding: '7px 12px', fontFamily: mono ? 'monospace' : undefined }}>{children}</td>
);

const primaryBtnStyle: React.CSSProperties = {
  padding: '6px 16px', borderRadius: 5, border: 'none',
  backgroundColor: '#4a9eff', color: '#fff', cursor: 'pointer', fontWeight: 600,
};
const secondaryBtnStyle: React.CSSProperties = {
  padding: '6px 14px', borderRadius: 5, border: '1px solid #555',
  backgroundColor: 'transparent', color: '#ccc', cursor: 'pointer',
};
const smallBtnStyle: React.CSSProperties = {
  padding: '3px 10px', borderRadius: 4, border: '1px solid #555',
  backgroundColor: 'transparent', color: '#ccc', cursor: 'pointer', fontSize: 11,
};
const editBtnStyle: React.CSSProperties = {
  padding: '3px 10px', borderRadius: 4, border: '1px solid #4a9eff',
  backgroundColor: 'transparent', color: '#4a9eff', cursor: 'pointer', fontSize: 12,
};
const labelStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#ccc',
};
const selectStyle: React.CSSProperties = {
  padding: '5px 8px', borderRadius: 4, border: '1px solid #444',
  backgroundColor: '#1e1e1e', color: '#e0e0e0', marginTop: 4,
};
