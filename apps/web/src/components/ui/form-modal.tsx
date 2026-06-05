'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useSaveShortcut } from '@/hooks/use-save-shortcut';

type FormModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onSubmit: () => void | Promise<void>;
  submitting?: boolean;
  submitLabel?: string;
  formId?: string;
  children: React.ReactNode;
};

/** Simple single-step modal form (for small CRUD like company/area). */
export function FormModal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  onSubmit,
  submitting = false,
  submitLabel = 'محفوظ کریں',
  formId = 'form-modal',
  children,
}: FormModalProps) {
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit();
  }

  useSaveShortcut(open, () => onSubmit());

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size={size}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            منسوخ
          </Button>
          <Button type="submit" form={formId} disabled={submitting}>
            {submitting ? 'محفوظ…' : submitLabel}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit}>
        {children}
      </form>
    </Modal>
  );
}
