'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { CustomerFormPage } from '@/components/forms/customer-form-page';

export default function NewCustomerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');

  return (
    <CustomerFormPage
      mode="create"
      returnTo={returnTo}
      onSaved={(customer, meta) => {
        const id = (customer as { id?: string })?.id;
        const saleTarget = returnTo || (meta?.hasSaleDraft ? '/dashboard/leases/new' : null);
        if (saleTarget && id) {
          const sep = saleTarget.includes('?') ? '&' : '?';
          router.push(`${saleTarget}${sep}customerId=${encodeURIComponent(id)}`);
          return;
        }
        router.push('/dashboard/customers');
      }}
    />
  );
}
