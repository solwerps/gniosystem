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
                    'flex items-center p-2 text-base font-normal rounded-lg text-white hover:bg-gray-700 group',
                    {
                        'bg-gray-800 font-semibold': isActive
                    }
                )}
            >
                {icon}
                <span className="ml-3">{title}</span>
            </Link>
        </li>
    );
};
