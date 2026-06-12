'use client';

import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-section';
import { UrduNameInput } from '@/components/forms/urdu-name-input';
import { ImageUpload } from '@/components/ui/image-upload';
import { compactInputClass, compactTextareaClass } from '@/components/forms/customer-form-fields';

export type GuarantorFormState = {
  name: string;
  cnic: string;
  phone: string;
  cnicFrontPhotoUrl: string;
  cnicBackPhotoUrl: string;
  presentAddress: string;
  permanentAddress: string;
};

export const emptyGuarantorForm: GuarantorFormState = {
  name: '',
  cnic: '',
  phone: '',
  cnicFrontPhotoUrl: '',
  cnicBackPhotoUrl: '',
  presentAddress: '',
  permanentAddress: '',
};

type GuarantorFormFieldsProps = {
  form: GuarantorFormState;
  onChange: (form: GuarantorFormState) => void;
  autoFocusName?: boolean;
};

export function GuarantorFormFields({ form, onChange, autoFocusName }: GuarantorFormFieldsProps) {
  function patch(partial: Partial<GuarantorFormState>) {
    onChange({ ...form, ...partial });
  }

  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      <FormField label="ضمانتی نام" compact>
        <UrduNameInput
          value={form.name}
          onChange={(name) => patch({ name })}
          required
          autoFocus={autoFocusName}
          className={compactInputClass}
        />
      </FormField>
      <FormField label="CNIC" compact>
        <Input
          value={form.cnic}
          onChange={(e) => patch({ cnic: e.target.value })}
          dir="ltr"
          className={`text-left ${compactInputClass}`}
        />
      </FormField>
      <FormField label="فون" compact className="sm:col-span-2">
        <Input
          value={form.phone}
          onChange={(e) => patch({ phone: e.target.value })}
          dir="ltr"
          className={`text-left ${compactInputClass}`}
        />
      </FormField>
      <FormField label="موجودہ پتہ" compact>
        <textarea
          className={compactTextareaClass}
          value={form.presentAddress}
          onChange={(e) => patch({ presentAddress: e.target.value })}
        />
      </FormField>
      <FormField label="مستقل پتہ" compact>
        <textarea
          className={compactTextareaClass}
          value={form.permanentAddress}
          onChange={(e) => patch({ permanentAddress: e.target.value })}
        />
      </FormField>
      <div className="col-span-full grid gap-2 sm:grid-cols-2">
        <ImageUpload
          label="CNIC سامنے"
          hint="اختیاری"
          value={form.cnicFrontPhotoUrl}
          onChange={(url) => patch({ cnicFrontPhotoUrl: url })}
          className="[&_button]:min-h-[7rem] [&_button]:py-3 [&_p]:text-xs"
        />
        <ImageUpload
          label="CNIC پیچھے"
          hint="اختیاری"
          value={form.cnicBackPhotoUrl}
          onChange={(url) => patch({ cnicBackPhotoUrl: url })}
          className="[&_button]:min-h-[7rem] [&_button]:py-3 [&_p]:text-xs"
        />
      </div>
    </div>
  );
}
