'use client';

import { useParams } from 'next/navigation';
import { LeaseEditForm } from '@/components/leases/lease-edit-form';

export default function LeaseEditPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';

  return <LeaseEditForm leaseId={id} />;
}
