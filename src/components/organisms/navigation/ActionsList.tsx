// src/components/organisms/navigation/ActionsList.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
//aqui puede que de error porque ya no se usa action

// 🧱 Atoms / Icons GNIO (imports individuales)
import { LogoutIcon } from '@/components/atoms/icons/LogoutIcon';
import { SettingsIcon } from '@/components/atoms/icons/SettingsIcon';
import { UserIcon } from '@/components/atoms/icons/UserIcon';

// 🧩 NavButton como molécula de navegación
import { NavButton } from '@/components/atoms/';

export const ActionList: React.FC = () => {
  const router = useRouter();

  return (
    <ul className="space-y-2">
      <NavButton
        icon={<SettingsIcon />}
        title={'Configuración'}
        action={() => router.push('/')}
      />
      <NavButton
        icon={<UserIcon />}
        title={'Perfil'}
        action={() => router.push('/profile')}
      />
      <NavButton
        icon={<LogoutIcon />}
        title={'Cerrar Sesión'}
/*         action={async () => await logout()} */
      />
    </ul>
  );
};
