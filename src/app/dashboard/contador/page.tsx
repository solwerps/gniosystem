import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';

export default async function ContadorDashboard() {
  const session = await getSession();

  if (!session || session.user.role !== 'CONTADOR' || !session.user.username) {
    redirect('/login');
  }

  redirect(`/dashboard/contador/${session.user.username}`);
}
