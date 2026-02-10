// src/components/Sidebar.tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  FileCheck, 
  UserCircle, 
  BookText, 
  Building2, 
  FileBarChart,
  Store,
  LogOut
} from 'lucide-react';

type Role = 'ADMIN' | 'CONTADOR' | 'EMPRESA';

interface SidebarProps {
  role: Role;
  /** Slug/username del tenant. Obligatorio para CONTADOR y EMPRESA. */
  usuario?: string;
}

type ModuleItem = { 
  name: string; 
  path?: string; 
  disabled?: boolean;
  icon?: React.ReactNode;
};

export default function Sidebar({ role, usuario }: SidebarProps) {
  const router = useRouter();
  const params = useParams();
  const [regimenOpen, setRegimenOpen] = useState(false);

  // Fallback: si no se pasa `usuario` (slug) por props, intentamos inferirlo de la ruta
  const usuarioFromRoute = useMemo(() => {
    const value = (params as any)?.usuario as string | string[] | undefined;
    if (typeof value === 'string') return value;
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
    return undefined;
  }, [params]);

  const resolvedUsuario = usuario ?? usuarioFromRoute;

  // Validación temprana: CONTADOR/EMPRESA requieren 'usuario'
  const requiresSlug = role === 'CONTADOR' || role === 'EMPRESA';
  const missingSlug = requiresSlug && !resolvedUsuario;

  const rolePath = useMemo<Role>(() => role, [role]);

  // base según rol (ADMIN no lleva slug; CONTADOR/EMPRESA sí)
  const base = useMemo(() => {
    if (rolePath === 'ADMIN') return '/dashboard/admin';
    const safeUser = resolvedUsuario ?? 'missing-slug';
    return rolePath === 'CONTADOR'
      ? `/dashboard/contador/${safeUser}`
      : `/dashboard/empresa/${safeUser}`;
  }, [rolePath, resolvedUsuario]);

  // Cerrar sesión
  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
  };

  const headerTitle =
    role === 'CONTADOR'
      ? `Oficina Contable ${resolvedUsuario ? `— ${resolvedUsuario}` : ''}`
      : role === 'EMPRESA'
      ? `SECA Empresa ${resolvedUsuario ? `— ${resolvedUsuario}` : ''}`
      : 'SECA (Admin)';

  // Menú por rol
  const modules: ModuleItem[] =
    role === 'ADMIN'
      ? [
          { name: 'Dashboard', path: `${base}`, icon: <LayoutDashboard className="w-4 h-4" /> },
          { name: 'Usuarios', path: `${base}/usuarios`, icon: <Users className="w-4 h-4" /> },
          { name: 'Configuración', path: `${base}/configuracion`, icon: <Settings className="w-4 h-4" /> },
        ]
      : role === 'CONTADOR'
      ? [
          { name: 'Dashboard', path: `${base}`, disabled: missingSlug, icon: <LayoutDashboard className="w-4 h-4" /> },
          { name: 'Perfil', path: `${base}/perfil`, disabled: missingSlug, icon: <UserCircle className="w-4 h-4" /> },
          { name: 'Nomenclatura', path: `${base}/nomenclatura`, disabled: missingSlug, icon: <BookText className="w-4 h-4" /> },
          { name: 'Empresas', path: `${base}/empresas`, disabled: missingSlug, icon: <Building2 className="w-4 h-4" /> },
          { name: 'Configuración', path: `${base}/configuracion`, disabled: missingSlug, icon: <Settings className="w-4 h-4" /> },
        ]
      : [
          { name: 'Dashboard', path: `${base}`, disabled: missingSlug, icon: <LayoutDashboard className="w-4 h-4" /> },
          { name: 'Perfil', path: `${base}/perfil`, disabled: missingSlug, icon: <UserCircle className="w-4 h-4" /> },
          { name: 'Nomenclatura', path: `${base}/nomenclatura`, disabled: missingSlug, icon: <BookText className="w-4 h-4" /> },
          { name: 'Sucursales', path: `${base}/sucursales`, disabled: missingSlug, icon: <Store className="w-4 h-4" /> },
          { name: 'Configuración', path: `${base}/configuracion`, disabled: missingSlug, icon: <Settings className="w-4 h-4" /> },
        ];

  // Rutas del submenú Régimen
  const regimenIvaPath = `${base}/regimen/iva`;
  const regimenIsrPath = `${base}/regimen/isr`;

  // Insertamos el dropdown después de "Nomenclatura"
  const insertAfterIndex = modules.findIndex((m) => m.name === 'Nomenclatura');

  return (
    <div className="flex h-screen w-64 flex-col bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-slate-50 shadow-2xl border-r border-blue-900/30">
      {/* Header con gradiente sutil */}
      <div className="relative flex h-20 items-center justify-between border-b border-blue-800/30 bg-gradient-to-r from-blue-900/40 to-transparent px-6 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent"></div>
        <div className="relative">
          <h1 className="text-lg font-bold tracking-wide text-blue-50">
            {headerTitle.split('—')[0]}
          </h1>
          {resolvedUsuario && (
            <p className="text-xs font-medium text-blue-300/80 mt-0.5">
              {resolvedUsuario}
            </p>
          )}
        </div>
      </div>

      {/* Alerta de slug faltante */}
      {missingSlug && (
        <div className="border-b border-amber-500/20 bg-gradient-to-r from-amber-600/20 to-amber-500/10 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
            <span className="text-xs font-medium text-amber-200">
              Falta el <b>usuario</b> (slug) para las rutas
            </span>
          </div>
        </div>
      )}

      {/* Navegación principal */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-blue-800/50 scrollbar-track-transparent">
        {modules.map((m, i) => (
          <div key={m.name}>
            <button
              onClick={() => {
                if (m.disabled) return;
                if (m.path) router.push(m.path);
              }}
              style={{ animationDelay: `${i * 40}ms` }}
              className={`group relative w-full animate-[fade-up_0.4s_ease-out] text-left text-sm font-medium transition-all duration-200 motion-reduce:animate-none flex items-center justify-between rounded-lg px-4 py-3 ${
                m.disabled
                  ? 'opacity-40 cursor-not-allowed'
                  : 'text-blue-100/90 hover:bg-blue-800/30 hover:text-white hover:shadow-lg hover:shadow-blue-900/20 active:scale-[0.98]'
              }`}
              disabled={!!m.disabled}
              title={m.disabled ? 'Completa el slug de usuario para navegar' : undefined}
            >
              {/* Indicador de hover */}
              {!m.disabled && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-blue-400 opacity-0 transition-opacity group-hover:opacity-100"></span>
              )}
              
              <span className="relative z-10 flex items-center gap-2">
                {m.icon}
                {m.name}
              </span>
              
              {/* Icono sutil de flecha */}
              {!m.disabled && (
                <svg className="w-4 h-4 text-blue-400/60 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>

            {/* Dropdown "Régimen" */}
            {i === insertAfterIndex && insertAfterIndex !== -1 && role !== 'ADMIN' && (
              <div
                className="relative mt-1"
                onMouseEnter={() => setRegimenOpen(true)}
                onMouseLeave={() => setRegimenOpen(false)}
              >
                <button
                  onClick={() => setRegimenOpen((v) => !v)}
                  className={`group relative w-full flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${
                    regimenOpen 
                      ? 'bg-blue-800/40 text-white shadow-lg shadow-blue-900/20' 
                      : 'text-blue-100/90 hover:bg-blue-800/30 hover:text-white'
                  } ${missingSlug ? 'opacity-40 cursor-not-allowed' : ''}`}
                  disabled={missingSlug}
                  title={missingSlug ? 'Completa el slug de usuario para navegar' : undefined}
                >
                  {!missingSlug && (
                    <span className={`absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-blue-400 transition-opacity ${regimenOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></span>
                  )}
                  
                  <span className="relative z-10 flex items-center gap-2">
                    <FileBarChart className="w-4 h-4" />
                    Régimen
                  </span>
                  
                  <svg 
                    className={`w-4 h-4 text-blue-300 transition-transform duration-200 ${regimenOpen ? 'rotate-180' : ''}`}
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                </button>

                {/* Submenu desplegable */}
                {regimenOpen && !missingSlug && (
                  <div className="mt-2 ml-3 overflow-hidden rounded-lg border border-blue-800/30 bg-gradient-to-br from-blue-950/90 to-slate-900/90 shadow-xl backdrop-blur-sm animate-[fade-up_0.2s_ease-out]">
                    <button
                      onClick={() => router.push(regimenIvaPath)}
                      className="group/sub relative block w-full text-left px-4 py-2.5 text-sm text-blue-100/90 hover:bg-blue-800/30 hover:text-white transition-all"
                    >
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.5 rounded-r-full bg-blue-400 opacity-0 transition-opacity group-hover/sub:opacity-100"></span>
                      <span className="pl-2">Régimen IVA</span>
                    </button>
                    <div className="h-px bg-blue-800/20"></div>
                    <button
                      onClick={() => router.push(regimenIsrPath)}
                      className="group/sub relative block w-full text-left px-4 py-2.5 text-sm text-blue-100/90 hover:bg-blue-800/30 hover:text-white transition-all"
                    >
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.5 rounded-r-full bg-blue-400 opacity-0 transition-opacity group-hover/sub:opacity-100"></span>
                      <span className="pl-2">Régimen ISR</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer con botón de logout */}
      <div className="border-t border-blue-800/30 bg-gradient-to-r from-blue-900/20 to-transparent p-4 backdrop-blur-sm">
        <button
          onClick={handleLogout}
          className="group relative w-full overflow-hidden rounded-lg bg-gradient-to-r from-red-600 to-red-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-red-900/30 transition-all hover:shadow-xl hover:shadow-red-900/40 active:scale-[0.98]"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </span>
          <span className="absolute inset-0 bg-gradient-to-r from-red-700 to-red-800 opacity-0 transition-opacity group-hover:opacity-100"></span>
        </button>
      </div>
    </div>
  );
}
