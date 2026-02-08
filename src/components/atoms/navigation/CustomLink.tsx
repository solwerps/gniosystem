'use client';
import React from 'react';
import Link from 'next/link';
import clsx from 'clsx';

interface Props {
    href: string;
    children: React.ReactNode;
    target?: '_blank' | undefined;
    icon?: boolean;
    loading?: boolean;
    disabled?: boolean;
    onClick?: () => void;
}

const CustomLink = ({
    href,
    children,
    target,
    icon,
    disabled,
    loading,
    onClick,
    ...props
}: Props) => {
    
    return (
        <Link
            onClick={onClick}
            href={href}
            className={clsx(
                'inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold tracking-[0.02em] shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] bg-emerald-600 text-white hover:bg-emerald-500 hover:shadow-emerald-500/40',
                {
                    'gap-2': icon,
                    '!bg-slate-200 !text-slate-500 !shadow-none !cursor-not-allowed':
                        loading || disabled
                }
            )}
            target={target}
            {...props}
        >
            {children}
        </Link>
    );
};

export default CustomLink;
