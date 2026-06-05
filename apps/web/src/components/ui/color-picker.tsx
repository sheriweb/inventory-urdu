'use client';

import { cn } from '@/lib/utils';
import { BRAND_PRESETS, normalizeBrandColor } from '@/lib/shop-branding';

type ColorPickerProps = {
  value: string;
  onChange: (hex: string) => void;
  className?: string;
};

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  const current = normalizeBrandColor(value);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-wrap gap-2.5">
        {BRAND_PRESETS.map((preset) => {
          const active = current.toLowerCase() === preset.hex.toLowerCase();
          return (
            <button
              key={preset.hex}
              type="button"
              title={preset.label}
              onClick={() => onChange(preset.hex)}
              className={cn(
                'group relative h-10 w-10 rounded-xl ring-2 ring-offset-2 transition hover:scale-105',
                active ? 'ring-slate-900 scale-105' : 'ring-transparent hover:ring-slate-300',
              )}
              style={{ backgroundColor: preset.hex }}
            >
              <span className="sr-only">{preset.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
        <label className="relative h-11 w-11 shrink-0 cursor-pointer overflow-hidden rounded-lg ring-1 ring-slate-200">
          <input
            type="color"
            value={current}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer border-0 p-0"
          />
        </label>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-800">اپنا رنگ منتخب کریں</p>
          <p className="text-xs text-slate-500" dir="ltr">
            {current}
          </p>
        </div>
        <div
          className="hidden h-9 min-w-[5rem] items-center justify-center rounded-lg px-3 text-xs font-semibold text-white sm:flex"
          style={{ backgroundColor: current }}
        >
          Preview
        </div>
      </div>
    </div>
  );
}
