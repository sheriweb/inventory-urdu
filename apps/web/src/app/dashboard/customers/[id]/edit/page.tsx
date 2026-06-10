'use client';

import { use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CustomerFormPage } from '@/components/forms/customer-form-page';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function EditCustomerPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');

  return (
    <CustomerFormPage
      mode="edit"
      editId={id}
      returnTo={returnTo}
      onSaved={() => {
        if (returnTo) {
          router.push(returnTo);
          return;
        }
        router.push('/dashboard/customers');
      }}
    />
  );
}
