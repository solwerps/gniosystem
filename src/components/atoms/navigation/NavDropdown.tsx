'use client';
import React, { useState, ReactNode } from 'react';
import clsx from 'clsx';
import Link from 'next/link';

interface NavDropdownProps {
    title: string;
    icon: ReactNode;
    items: DropdownItem[];
}

interface DropdownItem {
    key: string;
    href: string;
}

export const NavDropdown: React.FC<NavDropdownProps> = ({
    title,
    icon,
    items
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleDropdown = () => setIsOpen(!isOpen);
    const maxHeight = isOpen ? '500px' : '0';

    return (
        <li>
            <button
                type="button"
                className={clsx(
                    'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-200/90 transition-colors duration-200 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
                    isOpen &&
                        'bg-white/15 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)] !rounded-b-none'
                )}
                aria-expanded={isOpen}
                onClick={toggleDropdown}
            >
                {icon}
                <span className="flex-1 text-left">{title}</span>
                <svg
                    className={clsx(
                        'h-4 w-4 text-slate-300 transition-transform duration-300 ease-in-out',
                        isOpen ? 'rotate-180' : 'rotate-90'
                    )}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path d="M5 15l7-7 7 7" />
                </svg>
            </button>
            <ul
                style={{ maxHeight: maxHeight }}
                className="overflow-hidden rounded-b-xl bg-slate-950/60 ring-1 ring-white/10 transition-[max-height] duration-300 ease-out"
            >
                {items.map((item) => (
                    <li key={item.key} className="pl-9 hover:bg-white/10">
                        <Link
                            href={item.href}
                            className="block px-4 py-2 text-sm text-slate-200"
                        >
                            {item.key}
                        </Link>
                    </li>
                ))}
            </ul>
        </li>
    );
};
