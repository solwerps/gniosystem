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
                    'flex items-center w-full p-2 text-base font-normal transition-all duration-500 rounded-lg group text-white hover:bg-gray-700',
                    isOpen && 'bg-gray-800 !rounded-b-none'
                )}
                aria-expanded={isOpen}
                onClick={toggleDropdown}
            >
                {icon}
                <span className="flex-1 ml-3 text-left">{title}</span>
                <svg
                    className={clsx(
                        'w-4 h-4 transition-transform duration-300 ease-in-out',
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
                className="overflow-hidden transition-max-height duration-300 ease-in-out bg-gray-800 rounded-b-lg"
            >
                {items.map((item) => (
                    <li key={item.key} className="hover:bg-gray-700 pl-8">
                        <Link
                            href={item.href}
                            className="block px-4 py-2 text-white"
                        >
                            {item.key}
                        </Link>
                    </li>
                ))}
            </ul>
        </li>
    );
};
