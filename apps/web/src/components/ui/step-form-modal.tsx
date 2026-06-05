'use client';

import * as React from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useSaveShortcut } from '@/hooks/use-save-shortcut';

export type WizardStep = {
  title: string;
  description?: string;
  content?: React.ReactNode;
  validate?: () => boolean;
};

type StepFormModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  steps: WizardStep[];
  onSubmit: () => void | Promise<void>;
  submitting?: boolean;
  submitLabel?: string;
  formId?: string;
};

export function StepProgress({ steps, current }: { steps: WizardStep[]; current: number }) {
  if (steps.length <= 1) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-1">
        {steps.map((step, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <React.Fragment key={step.title}>
              <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all',
                    done && 'bg-emerald-600 text-white shadow-sm',
                    active && 'bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-md',
                    !done && !active && 'bg-slate-100 text-slate-400',
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                <span
                  className={cn(
                    'hidden max-w-[5.5rem] truncate text-center text-[11px] font-medium sm:block',
                    active ? 'text-emerald-800' : done ? 'text-emerald-700' : 'text-slate-400',
                  )}
                >
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 ? (
                <div
                  className={cn(
                    'mb-5 h-0.5 min-w-[1rem] flex-1 rounded-full transition-colors',
                    index < current ? 'bg-emerald-500' : 'bg-slate-200',
                  )}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </div>
      <div className="mt-4 rounded-xl border border-emerald-100 bg-gradient-to-l from-emerald-50/90 to-white px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">{steps[current]?.title}</p>
        {steps[current]?.description ? (
          <p className="mt-0.5 text-xs text-slate-500">{steps[current].description}</p>
        ) : null}
      </div>
    </div>
  );
}

export function StepFormModal({
  open,
  onClose,
  title,
  description,
  size = 'lg',
  steps,
  onSubmit,
  submitting = false,
  submitLabel = 'محفوظ کریں',
  formId = 'step-form-modal',
}: StepFormModalProps) {
  const [step, setStep] = React.useState(0);
  const saveLockRef = React.useRef(false);
  const isLast = step >= steps.length - 1;
  const isFirst = step === 0;

  React.useEffect(() => {
    if (!open) setStep(0);
  }, [open]);

  function handleClose() {
    setStep(0);
    onClose();
  }

  function validateAllSteps(): boolean {
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      if (s.validate && !s.validate()) {
        setStep(i);
        return false;
      }
    }
    return true;
  }

  function goNext() {
    const current = steps[step];
    if (current?.validate && !current.validate()) return;
    if (isLast) return;

    saveLockRef.current = true;
    setStep((s) => s + 1);
    window.setTimeout(() => {
      saveLockRef.current = false;
    }, 400);
  }

  function goBack() {
    if (!isFirst) setStep((s) => s - 1);
  }

  async function handleSave() {
    if (saveLockRef.current || submitting) return;
    if (!validateAllSteps()) return;
    await onSubmit();
  }

  useSaveShortcut(open && isLast, handleSave);

  function handleFormKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key !== 'Enter') return;
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'TEXTAREA') return;
    e.preventDefault();
    if (isLast) void handleSave();
    else goNext();
  }

  return (
    <Modal
      open={open}
      stack="top"
      onClose={handleClose}
      title={title}
      description={description}
      size={size}
      footer={
        <>
          <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
            منسوخ
          </Button>
          {!isFirst ? (
            <Button type="button" variant="outline" onClick={goBack} disabled={submitting} className="gap-1">
              <ChevronRight className="h-4 w-4" />
              پچھلا
            </Button>
          ) : null}
          <div className="relative inline-flex min-w-[7rem]">
            <Button
              type="button"
              onClick={goNext}
              disabled={submitting || isLast}
              aria-hidden={isLast}
              className={cn('gap-1', isLast && 'pointer-events-none invisible absolute inset-0')}
            >
              اگلا
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={submitting || !isLast}
              aria-hidden={!isLast}
              className={cn(!isLast && 'pointer-events-none invisible absolute inset-0')}
            >
              {submitting ? 'محفوظ…' : submitLabel}
            </Button>
          </div>
        </>
      }
    >
      <StepProgress steps={steps} current={step} />
      <form id={formId} onSubmit={(e) => e.preventDefault()} onKeyDown={handleFormKeyDown}>
        <div className="min-h-[16rem]">{steps[step]?.content}</div>
      </form>
    </Modal>
  );
}
