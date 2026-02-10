import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';

export default async function EmpresaDashboard() {
  const session = await getSession();

  if (!session || session.user.role !== 'EMPRESA' || !session.user.username) {
    redirect('/login');
  }

  redirect(`/dashboard/empresa/${session.user.username}`);
}
