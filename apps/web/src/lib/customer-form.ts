import type { CustomerFormState } from '@/components/forms/customer-form-fields';
import { parseAdditionalMobiles, sanitizeAdditionalMobiles } from '@/lib/customer-mobiles';

export const emptyCustomerForm: CustomerFormState = {
  name: '',
  fatherOrHusbandName: '',
  caste: '',
  profession: '',
  mobile: '',
  additionalMobiles: ['', ''],
  cnic: '',
  city: '',
  areaId: '',
  presentAddress: '',
  permanentAddress: '',
  bankName: '',
  chequeNumber: '',
  cnicPhotoUrl: '',
  photoUrl: '',
  cnicFrontPhotoUrl: '',
  cnicBackPhotoUrl: '',
  chequePhotoUrl: '',
};

export function customerPayload(form: CustomerFormState) {
  return {
    name: form.name,
    areaId: form.areaId || undefined,
    fatherOrHusbandName: form.fatherOrHusbandName || undefined,
    caste: form.caste || undefined,
    profession: form.profession || undefined,
    mobile: form.mobile.trim() || undefined,
    additionalMobiles: (() => {
      const extras = sanitizeAdditionalMobiles(form.additionalMobiles);
      return extras.length > 0 ? extras : undefined;
    })(),
    cnic: form.cnic || undefined,
    city: form.city || undefined,
    presentAddress: form.presentAddress || undefined,
    permanentAddress: form.permanentAddress || undefined,
    bankName: form.bankName || undefined,
    chequeNumber: form.chequeNumber || undefined,
    cnicPhotoUrl: form.cnicPhotoUrl || undefined,
    photoUrl: form.photoUrl || undefined,
    cnicFrontPhotoUrl: form.cnicFrontPhotoUrl || undefined,
    cnicBackPhotoUrl: form.cnicBackPhotoUrl || undefined,
    chequePhotoUrl: form.chequePhotoUrl || undefined,
  };
}

export function customerToForm(customer: {
  name: string;
  fatherOrHusbandName?: string | null;
  caste?: string | null;
  profession?: string | null;
  mobile?: string | null;
  additionalMobiles?: unknown;
  cnic?: string | null;
  city?: string | null;
  areaId?: string | null;
  presentAddress?: string | null;
  permanentAddress?: string | null;
  bankName?: string | null;
  chequeNumber?: string | null;
  cnicPhotoUrl?: string | null;
  photoUrl?: string | null;
  cnicFrontPhotoUrl?: string | null;
  cnicBackPhotoUrl?: string | null;
  chequePhotoUrl?: string | null;
  area?: { id: string } | null;
}): CustomerFormState {
  return {
    name: customer.name,
    fatherOrHusbandName: customer.fatherOrHusbandName ?? '',
    caste: customer.caste ?? '',
    profession: customer.profession ?? '',
    mobile: customer.mobile ?? '',
    additionalMobiles: parseAdditionalMobiles(customer.additionalMobiles),
    cnic: customer.cnic ?? '',
    city: customer.city ?? '',
    areaId: customer.areaId ?? customer.area?.id ?? '',
    presentAddress: customer.presentAddress ?? '',
    permanentAddress: customer.permanentAddress ?? '',
    bankName: customer.bankName ?? '',
    chequeNumber: customer.chequeNumber ?? '',
    cnicPhotoUrl: customer.cnicPhotoUrl ?? '',
    photoUrl: customer.photoUrl ?? '',
    cnicFrontPhotoUrl: customer.cnicFrontPhotoUrl ?? customer.cnicPhotoUrl ?? '',
    cnicBackPhotoUrl: customer.cnicBackPhotoUrl ?? '',
    chequePhotoUrl: customer.chequePhotoUrl ?? '',
  };
}
