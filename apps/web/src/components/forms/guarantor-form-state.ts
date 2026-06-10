import { parseAdditionalMobiles, sanitizeAdditionalMobiles } from '@/lib/customer-mobiles';

export type GuarantorFormState = {
  id: string;
  name: string;
  fatherOrHusbandName: string;
  caste: string;
  cnic: string;
  phone: string;
  additionalMobiles: string[];
  cnicFrontPhotoUrl: string;
  cnicBackPhotoUrl: string;
  photoUrl: string;
  presentAddress: string;
};

export const emptyGuarantorForm = (): GuarantorFormState => ({
  id: '',
  name: '',
  fatherOrHusbandName: '',
  caste: '',
  cnic: '',
  phone: '',
  additionalMobiles: ['', ''],
  cnicFrontPhotoUrl: '',
  cnicBackPhotoUrl: '',
  photoUrl: '',
  presentAddress: '',
});

export function guarantorFromApi(row: {
  id: string;
  name: string;
  fatherOrHusbandName?: string | null;
  caste?: string | null;
  cnic?: string | null;
  phone?: string | null;
  additionalMobiles?: unknown;
  cnicFrontPhotoUrl?: string | null;
  cnicBackPhotoUrl?: string | null;
  photoUrl?: string | null;
  presentAddress?: string | null;
}): GuarantorFormState {
  return {
    id: row.id,
    name: row.name ?? '',
    fatherOrHusbandName: row.fatherOrHusbandName ?? '',
    caste: row.caste ?? '',
    cnic: row.cnic ?? '',
    phone: row.phone ?? '',
    additionalMobiles: parseAdditionalMobiles(row.additionalMobiles),
    cnicFrontPhotoUrl: row.cnicFrontPhotoUrl ?? '',
    cnicBackPhotoUrl: row.cnicBackPhotoUrl ?? '',
    photoUrl: row.photoUrl ?? '',
    presentAddress: row.presentAddress ?? '',
  };
}

export function guarantorPayload(form: GuarantorFormState) {
  const extras = sanitizeAdditionalMobiles(form.additionalMobiles);
  return {
    name: form.name.trim(),
    fatherOrHusbandName: form.fatherOrHusbandName.trim() || undefined,
    caste: form.caste.trim() || undefined,
    cnic: form.cnic.trim() || undefined,
    phone: form.phone.trim() || undefined,
    additionalMobiles: extras.length > 0 ? extras : undefined,
    cnicFrontPhotoUrl: form.cnicFrontPhotoUrl.trim() || undefined,
    cnicBackPhotoUrl: form.cnicBackPhotoUrl.trim() || undefined,
    photoUrl: form.photoUrl.trim() || undefined,
    presentAddress: form.presentAddress.trim() || undefined,
  };
}

export function guarantorHasContent(form: GuarantorFormState): boolean {
  return Boolean(
    form.name.trim() ||
      form.phone.trim() ||
      form.additionalMobiles.some((m) => m.trim()) ||
      form.cnic.trim() ||
      form.cnicFrontPhotoUrl.trim() ||
      form.cnicBackPhotoUrl.trim() ||
      form.photoUrl.trim(),
  );
}
