'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { SelectWithAdd } from '@/components/forms/select-with-add';
import {
  addCustomerFieldPreset,
  getCustomerFieldPresets,
  type CustomerFieldPresetKey,
} from '@/lib/customer-field-presets';

type PresetFieldWithAddProps = {
  presetKey: CustomerFieldPresetKey;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  addTitle: string;
  modalTitle: string;
  compact?: boolean;
};

export function PresetFieldWithAdd({
  presetKey,
  value,
  onChange,
  disabled,
  className,
  placeholder = '— منتخب کریں —',
  addTitle,
  modalTitle,
  compact = false,
}: PresetFieldWithAddProps) {
  const [presets, setPresets] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    setPresets(getCustomerFieldPresets(presetKey));
  }, [presetKey]);

  const options = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const item of presets) {
      const trimmed = item.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      list.push(trimmed);
    }
    const current = value.trim();
    if (current && !seen.has(current)) {
      list.unshift(current);
    }
    return list;
  }, [presets, value]);

  function openModal() {
    setDraft('');
    setModalOpen(true);
  }

  function handleSave() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    const next = addCustomerFieldPreset(presetKey, trimmed);
    setPresets(next);
    onChange(trimmed);
    setModalOpen(false);
  }

  return (
    <>
      <SelectWithAdd
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={className}
        compact={compact}
        addTitle={addTitle}
        onAddClick={openModal}
      >
        <option value="">{placeholder}</option>
        {options.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </SelectWithAdd>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              منسوخ
            </Button>
            <Button type="button" onClick={handleSave} disabled={!draft.trim()}>
              شامل کریں
            </Button>
          </div>
        }
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoFocus
          placeholder="نام درج کریں"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSave();
            }
          }}
        />
      </Modal>
    </>
  );
}
