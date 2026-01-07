// src/components/navigation/navList.tsx
import React from 'react';

// 🧩 Íconos GNIO (import uno por uno)
import { CharIcon } from '@/components/atoms/icons';
import { ClientIcon } from '@/components/atoms/icons/ClientIcon';
import { DashbordIcon } from '@/components/atoms/icons/DashbordIcon';
import { FacturaIcon } from '@/components/atoms/icons/FacturaIcon';
import { HomeIcon } from '@/components/atoms/icons/HomeIcon';
import { ListIcon } from '@/components/atoms/icons/ListIcon';
import { PartidasIcon } from '@/components/atoms/icons/PartidasIcon';
import { ReportIcon } from '@/components/atoms/icons/ReportIcon';
import { UserIcon } from '@/components/atoms/icons/UserIcon';

export const navList = [
  {
    key: 'Dashboard',
    href: '/',
    icon: <DashbordIcon />,
    rol: [1, 2, 3, 4],
  },
  {
    key: 'Usuarios',
    href: '/usuarios',
    icon: <UserIcon />,
    rol: [1, 2, 3, 4],
  },
  {
    key: 'Nomenclatura Contable',
    href: '/nomenclatura',
    icon: <ListIcon />,
    rol: [1, 2, 3, 4],
    // children: [
    //   { key: 'Tipos de nomenclatura', href: '/nomenclatura' },
    //   { key: 'Cuentas', href: '/nomenclatura/cuentas' }
    // ]
  },
  {
    key: 'Empresas',
    href: '/empresas',
    icon: <ClientIcon />,
    rol: [1, 2, 3, 4],
  },
  // {
  //   key: 'Estadisticas',
  //   href: '/stadisticas',
  //   icon: <CharIcon />,
  //   rol: [1, 2, 3, 4]
  // },
  {
    key: 'Documentos',
    href: '/documentos',
    icon: <ReportIcon />,
    children: [
      { key: 'Facturas', href: '/documentos' },
      { key: 'Retenciones IVA', href: '/documentos/retenciones/iva' },
      { key: 'Retenciones ISR', href: '/documentos/retenciones/isr' },
    ],
    rol: [1, 2, 3, 4],
  },
  {
    key: 'Libros',
    href: '/libros',
    icon: <FacturaIcon />,
    children: [
      { key: 'Listado de libros', href: '/libros' },
      { key: 'Gestión de folios', href: '/libros' },
      { key: 'Conciliación Bancaria', href: '/libros/conciliacion' },
    ],
    rol: [1, 2, 3, 4],
  },
  {
    key: 'Asientos Contables',
    href: '/asientos_contables',
    icon: <PartidasIcon />,
    children: [
      { key: 'Buscador', href: '/asientos_contables' },
      { key: 'Formulario', href: '/asientos_contables/crear' },
    ],
    rol: [1, 2, 3, 4],
  },
  {
    key: 'Formularios',
    href: '/reportes',
    icon: <ListIcon />,
    rol: [1, 2, 3, 4],
  },
];
