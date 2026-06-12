'use client';

import { Input } from '@/components/ui/input';
import { InputWithVoice } from '@/components/forms/input-with-voice';
import { QuickAddSelect } from '@/components/forms/quick-add-select';
import { PresetFieldWithAdd } from '@/components/forms/preset-field-with-add';
import { FormField } from '@/components/ui/form-section';
import { UrduNameInput } from '@/components/forms/urdu-name-input';
import { RomanUrduTextarea } from '@/components/forms/roman-urdu-textarea';
import { ImageUpload } from '@/components/ui/image-upload';
import { MultiMobileFields } from '@/components/forms/multi-mobile-fields';
import type { Area } from '@inventory-urdu/shared';

export type CustomerFormState = {
  name: string;
  fatherOrHusbandName: string;
  caste: string;
  profession: string;
  mobile: string;
  additionalMobiles: string[];
  cnic: string;
  city: string;
  areaId: string;
  presentAddress: string;
  permanentAddress: string;
  bankName: string;
  chequeNumber: string;
  cnicPhotoUrl: string;
  photoUrl: string;
  cnicFrontPhotoUrl: string;
  cnicBackPhotoUrl: string;
  chequePhotoUrl: string;
};

export const compactInputClass = 'h-8 py-1 text-xs';
export const compactTextareaClass =
  'flex min-h-[2.75rem] w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600';

type CustomerFormFieldsProps = {
  form: CustomerFormState;
  onChange: (form: CustomerFormState) => void;
  areas: Area[];
  onAreaAdded: (area: Area) => void;
  autoFocusName?: boolean;
  showDocuments?: boolean;
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="col-span-full border-b border-slate-100 pb-1 text-xs font-semibold text-slate-600">{children}</p>
  );
}

export function CustomerFormFields({
  form,
  onChange,
  areas,
  onAreaAdded,
  autoFocusName,
  showDocuments = true,
}: CustomerFormFieldsProps) {
  function patch(partial: Partial<CustomerFormState>) {
    onChange({ ...form, ...partial });
  }

  return (
    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
      <SectionTitle>ذاتی معلومات</SectionTitle>
      <FormField label="نام" compact>
        <UrduNameInput
          value={form.name}
          onChange={(name) => patch({ name })}
          required
          autoFocus={autoFocusName}
          className={compactInputClass}
        />
      </FormField>
      <FormField label="والد/شوہر کا نام" compact>
        <UrduNameInput
          value={form.fatherOrHusbandName}
          onChange={(fatherOrHusbandName) => patch({ fatherOrHusbandName })}
          className={compactInputClass}
        />
      </FormField>
      <FormField label="ذات" compact>
        <PresetFieldWithAdd
          presetKey="caste"
          value={form.caste}
          onChange={(caste) => patch({ caste })}
          className={compactInputClass}
          compact
          addTitle="نیا ذات"
          modalTitle="نیا ذات شامل کریں"
        />
      </FormField>
      <FormField label="پیشہ" compact>
        <PresetFieldWithAdd
          presetKey="profession"
          value={form.profession}
          onChange={(profession) => patch({ profession })}
          className={compactInputClass}
          compact
          addTitle="نیا پیشہ"
          modalTitle="نیا پیشہ شامل کریں"
        />
      </FormField>

      <SectionTitle>رابطہ و علاقہ</SectionTitle>
      <MultiMobileFields
        primary={form.mobile}
        additional={form.additionalMobiles}
        onPrimaryChange={(mobile) => patch({ mobile })}
        onAdditionalChange={(additionalMobiles) => patch({ additionalMobiles })}
      />
      <FormField label="CNIC" compact>
        <InputWithVoice
          value={form.cnic}
          onChange={(e) => patch({ cnic: e.target.value })}
          voiceMode="number"
          voiceTitle="CNIC بولیں"
          compact
          dir="ltr"
          className={`text-left ${compactInputClass}`}
        />
      </FormField>
      <FormField label="شہر" compact>
        <PresetFieldWithAdd
          presetKey="city"
          value={form.city}
          onChange={(city) => patch({ city })}
          className={compactInputClass}
          compact
          addTitle="نیا شہر"
          modalTitle="نیا شہر شامل کریں"
        />
      </FormField>
      <FormField label="علاقہ" compact>
        <QuickAddSelect
          entity="area"
          value={form.areaId}
          onChange={(id) => patch({ areaId: id })}
          placeholder="— منتخب کریں —"
          options={areas.map((a) => ({
            value: a.id,
            label: `${a.name}${a.city ? ` (${a.city})` : ''}`,
          }))}
          onOptionAdded={(record) => onAreaAdded(record as Area)}
          className={compactInputClass}
          compact
        />
      </FormField>

      <SectionTitle>پتہ</SectionTitle>
      <FormField label="موجودہ پتہ" compact className="sm:col-span-2">
        <RomanUrduTextarea
          value={form.presentAddress}
          onChange={(presentAddress) => patch({ presentAddress })}
          className={compactTextareaClass}
        />
      </FormField>
      <FormField label="مستقل پتہ" compact className="sm:col-span-2">
        <RomanUrduTextarea
          value={form.permanentAddress}
          onChange={(permanentAddress) => patch({ permanentAddress })}
          className={compactTextareaClass}
        />
      </FormField>

      <SectionTitle>بینک</SectionTitle>
      <FormField label="بینک" compact>
        <Input value={form.bankName} onChange={(e) => patch({ bankName: e.target.value })} className={compactInputClass} />
      </FormField>
      <FormField label="چیک نمبر" compact>
        <Input
          value={form.chequeNumber}
          onChange={(e) => patch({ chequeNumber: e.target.value })}
          dir="ltr"
          className={`text-left ${compactInputClass}`}
        />
      </FormField>

      {showDocuments ? (
        <>
          <SectionTitle>دستاویز (اختیاری)</SectionTitle>
          <div className="col-span-full grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <ImageUpload
              label="گاہک کی تصویر"
              hint="اختیاری"
              value={form.photoUrl}
              onChange={(url) => patch({ photoUrl: url })}
              className="[&_button]:min-h-[7rem] [&_button]:py-3 [&_p]:text-xs"
            />
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
            <ImageUpload
              label="چیک کی تصویر"
              hint="اختیاری"
              value={form.chequePhotoUrl}
              onChange={(url) => patch({ chequePhotoUrl: url })}
              className="[&_button]:min-h-[7rem] [&_button]:py-3 [&_p]:text-xs"
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
