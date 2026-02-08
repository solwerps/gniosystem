'use client';
import React, { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

interface NavItemProps {
    href: string;
    icon: ReactNode;
    title: string;
}

export const NavItem: React.FC<NavItemProps> = ({ href, icon, title }) => {
    const pathname = usePathname();
    const isActive = pathname === href;
    return (
        <li>
            <Link
                href={href}
                className={clsx(
                    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-200/90 transition-colors duration-200 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
                    {
                        'bg-white/15 text-white font-semibold shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]':
                            isActive
                    }
                )}
            >
                {icon}
                <span className="truncate">{title}</span>
            </Link>
        </li>
    );
};
