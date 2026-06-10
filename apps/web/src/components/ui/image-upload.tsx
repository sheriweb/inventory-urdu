'use client';

import { DragEvent, useCallback, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import { CheckCircle2, ImageIcon, Loader2, Upload, X } from 'lucide-react';
import api from '@/lib/api';
import { resolveImageUrl } from '@/lib/image-url';
import { cn } from '@/lib/utils';

type ImageUploadProps = {
  label?: string;
  value?: string;
  onChange: (url: string) => void;
  hint?: string;
  className?: string;
  aspect?: 'card' | 'wide';
  disabled?: boolean;
};

async function compressImage(file: File, maxSize = 1600, quality = 0.82): Promise<File> {
  if (file.type === 'image/gif' || file.size < 400_000) return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) return file;

  const base = file.name.replace(/\.[^.]+$/, '') || 'photo';
  return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function uploadErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const message = err.response?.data?.message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message) && message[0]) return String(message[0]);
    if (err.response?.status === 404) return 'اپ لوڈ سروس دستیاب نہیں — API دوبارہ شروع کریں';
    if (err.response?.status === 413) return 'تصویر بہت بڑی ہے — چھوٹی تصویر منتخب کریں';
  }
  return 'تصویر اپ لوڈ نہیں ہو سکی';
}

export function ImageUpload({
  label,
  value = '',
  onChange,
  hint,
  className,
  aspect = 'card',
  disabled = false,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        setError('صرف تصویر فائل منتخب کریں (JPG، PNG)');
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        setError('تصویر 8MB سے چھوٹی ہونی چاہیے');
        return;
      }

      setUploading(true);
      setError('');
      try {
        const prepared = await compressImage(file);
        const dataUrl = await readFileAsDataUrl(prepared);
        const { data: res } = await api.post<{ data: { url: string } }>('/uploads/image', {
          data: dataUrl,
          filename: prepared.name,
        });
        const url = res?.data?.url;
        if (!url) throw new Error('invalid response');
        onChange(url);
      } catch (err) {
        setError(uploadErrorMessage(err));
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [onChange],
  );

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (disabled) return;
    const file = e.target.files?.[0];
    if (file) void uploadFile(file);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  }

  const preview = value ? resolveImageUrl(value) : '';

  return (
    <div className={className}>
      {label ? <p className="mb-1.5 text-sm font-semibold text-slate-800">{label}</p> : null}
      {hint ? <p className="mb-2 text-xs text-slate-500">{hint}</p> : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={onFileChange}
      />

      {preview ? (
        <div
          className={cn(
            'group relative overflow-hidden rounded-xl border border-emerald-200 bg-slate-50 shadow-sm',
            aspect === 'wide' ? 'aspect-[2/1]' : 'aspect-[4/3]',
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt={label ?? 'تصویر'} className="h-full w-full object-contain p-2" />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/90 px-2 py-0.5 text-[11px] font-medium text-white">
              <CheckCircle2 className="h-3 w-3" />
              اپ لوڈ ہو گئی
            </span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange('')}
              className="rounded-lg bg-white/90 p-1.5 text-slate-700 shadow hover:bg-white disabled:opacity-50"
              aria-label="تصویر ہٹائیں"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            disabled={uploading || disabled}
            onClick={() => inputRef.current?.click()}
            className="absolute inset-x-3 bottom-3 rounded-lg border border-white/60 bg-white/90 py-1.5 text-xs font-medium text-slate-700 opacity-0 shadow transition group-hover:opacity-100 hover:bg-white disabled:opacity-50"
          >
            تصویر بدلیں
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading || disabled}
          onClick={() => inputRef.current?.click()}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragging(false);
          }}
          onDrop={onDrop}
          className={cn(
            'flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-6 text-center transition',
            aspect === 'wide' ? 'min-h-[9rem]' : 'min-h-[11rem]',
            dragging
              ? 'border-emerald-500 bg-emerald-50/80'
              : 'border-slate-200 bg-gradient-to-b from-slate-50 to-white hover:border-emerald-400 hover:bg-emerald-50/40',
            uploading && 'pointer-events-none opacity-70',
          )}
        >
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full',
              dragging ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-50 text-emerald-600',
            )}
          >
            {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800">
              {uploading ? 'اپ لوڈ ہو رہی ہے…' : 'تصویر یہاں گھسیٹیں یا کلک کریں'}
            </p>
            <p className="mt-1 text-xs text-slate-500">JPG، PNG، WEBP — 5MB تک (اختیاری)</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">
            <ImageIcon className="h-3.5 w-3.5" />
            فائل منتخب کریں
          </span>
        </button>
      )}

      {error ? <p className="mt-2 text-xs font-medium text-red-600">{error}</p> : null}
    </div>
  );
}
