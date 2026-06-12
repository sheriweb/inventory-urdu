'use client';

import { Input } from '@/components/ui/input';
import { InputWithVoice } from '@/components/forms/input-with-voice';
import { UrduNameInput } from '@/components/forms/urdu-name-input';
import { SelectWithAdd } from '@/components/forms/select-with-add';
import { MultiMobileFields } from '@/components/forms/multi-mobile-fields';
import { ImageUpload } from '@/components/ui/image-upload';
import { FormField } from '@/components/ui/form-section';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { compactInputClass, compactTextareaClass } from '@/components/forms/customer-form-fields';
import type { GuarantorFormState } from '@/components/forms/guarantor-form-state';

type GuarantorOption = { id: string; name: string };

type GuarantorDetailCardProps = {
  guarantor: GuarantorFormState;
  onChange: (next: GuarantorFormState) => void;
  options?: GuarantorOption[];
  disabled?: boolean;
  showSelector?: boolean;
  onAddNew?: () => void;
  /** Render fields only — no outer Card (e.g. inside نئی فروخت) */
  embedded?: boolean;
};

export function GuarantorDetailCard({
  guarantor,
  onChange,
  options = [],
  disabled,
  showSelector = false,
  onAddNew,
  embedded = false,
}: GuarantorDetailCardProps) {
  const fieldClass = compactInputClass;
  const textareaClass = compactTextareaClass;

  function patch(partial: Partial<GuarantorFormState>) {
    onChange({ ...guarantor, ...partial });
  }

  function selectGuarantor(id: string) {
    const selected = options.find((g) => g.id === id);
    if (!selected) {
      patch({
        id: '',
        name: '',
        fatherOrHusbandName: '',
        caste: '',
        cnic: '',
        phone: '',
        additionalMobiles: [],
        cnicFrontPhotoUrl: '',
        cnicBackPhotoUrl: '',
        photoUrl: '',
        presentAddress: '',
      });
      return;
    }
    patch({ id: selected.id, name: selected.name });
  }

  const body = (
    <>
        {showSelector && options.length > 0 ? (
          <FormField label="ضامن" compact>
            <SelectWithAdd
              value={guarantor.id}
              onChange={(e) => selectGuarantor(e.target.value)}
              disabled={disabled}
              onAddClick={onAddNew}
              addTitle="نیا ضامن"
              className={fieldClass}
            >
              <option value="">— ضامن منتخب کریں —</option>
              {options.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </SelectWithAdd>
          </FormField>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <FormField label="ضامن نام" compact>
            <UrduNameInput
              value={guarantor.name}
              onChange={(name) => patch({ name })}
              disabled={disabled}
              className={fieldClass}
            />
          </FormField>
          <FormField label="والد کا نام" compact>
            <UrduNameInput
              value={guarantor.fatherOrHusbandName}
              onChange={(fatherOrHusbandName) => patch({ fatherOrHusbandName })}
              disabled={disabled}
              className={fieldClass}
            />
          </FormField>
          <FormField label="قوم" compact>
            <Input
              value={guarantor.caste}
              onChange={(e) => patch({ caste: e.target.value })}
              disabled={disabled}
              className={fieldClass}
            />
          </FormField>
          <FormField label="شناختی کارڈ" compact>
            <InputWithVoice
              value={guarantor.cnic}
              onChange={(e) => patch({ cnic: e.target.value })}
              disabled={disabled}
              voiceMode="number"
              voiceTitle="CNIC بولیں"
              compact
              dir="ltr"
              className={`text-left ${fieldClass}`}
            />
          </FormField>
          <div className="col-span-full">
            <MultiMobileFields
              primary={guarantor.phone}
              additional={guarantor.additionalMobiles}
              onPrimaryChange={(phone) => patch({ phone })}
              onAdditionalChange={(additionalMobiles) => patch({ additionalMobiles })}
              disabled={disabled}
            />
          </div>
          <FormField label="پتہ" compact className="sm:col-span-2 lg:col-span-3">
            <textarea
              className={textareaClass}
              value={guarantor.presentAddress}
              onChange={(e) => patch({ presentAddress: e.target.value })}
              disabled={disabled}
            />
          </FormField>
        </div>
        <div className="grid gap-3 border-t border-slate-100 pt-2.5 sm:grid-cols-3">
          <ImageUpload
            label="ضامن کی تصویر"
            hint="اختیاری"
            value={guarantor.photoUrl}
            onChange={(photoUrl) => patch({ photoUrl })}
            disabled={disabled}
            className="[&_button]:min-h-[7rem] [&_button]:py-3 [&_p]:text-xs"
          />
          <ImageUpload
            label="CNIC سامنے"
            hint="اختیاری"
            value={guarantor.cnicFrontPhotoUrl}
            onChange={(cnicFrontPhotoUrl) => patch({ cnicFrontPhotoUrl })}
            disabled={disabled}
            className="[&_button]:min-h-[7rem] [&_button]:py-3 [&_p]:text-xs"
          />
          <ImageUpload
            label="CNIC پیچھے"
            hint="اختیاری"
            value={guarantor.cnicBackPhotoUrl}
            onChange={(cnicBackPhotoUrl) => patch({ cnicBackPhotoUrl })}
            disabled={disabled}
            className="[&_button]:min-h-[7rem] [&_button]:py-3 [&_p]:text-xs"
          />
        </div>
    </>
  );

  if (embedded) {
    return <div className="space-y-2.5">{body}</div>;
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
        <CardTitle className="text-sm text-slate-900">ضامن کی تفصیل</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 p-3 pt-3">{body}</CardContent>
    </Card>
  );
}
