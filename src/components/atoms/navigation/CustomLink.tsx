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
                'middle none center rounded-lg py-3 px-6 text-xs font-semibold shadow-md transition-all hover:shadow-lg focus:opacity-[0.85] focus:shadow-none active:opacity-[0.85] active:shadow-none disabled:opacity-50 disabled:shadow-none max-h-[40px] bg-primary text-white shadow-blue-500/20 hover:shadow-blue-500/40',
                {
                    'flex items-center justify-content-center gap-2': icon,
                    '!bg-slate-400 !cursor-not-allowed': loading || disabled
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
