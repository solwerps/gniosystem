// src/components/atoms/Button.tsx
'use client';
import React from 'react';
import clsx from 'clsx';
import { LoaderIcon } from './icons';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    className?: string;
    variant?: 'primary' | 'secondary' | 'success' | 'error' | 'outlined';
    icon?: boolean;
    loading?: boolean;
}

export const Button = ({
    children,
    className = '',
    variant = 'primary',
    icon,
    disabled,
    loading,
    ...rest
}: Props) => {
    return (
        <button
            className={clsx(
                handleVariant(variant),
                {
                    // importante: flex correcto cuando es botón con icono
                    'gap-2': icon,
                    '!bg-slate-200 !text-slate-500 !shadow-none !cursor-not-allowed':
                        loading || disabled
                },
                className
            )}
            disabled={disabled || loading}
            {...rest}
        >
            {loading ? LoaderIcon() : children}
        </button>
    );
};

const handleVariant = (variant: string) => {
    const configGeneral =
        'inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold tracking-[0.02em] shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] disabled:opacity-60 disabled:cursor-not-allowed';

    switch (variant) {
        case 'primary':
            return `${configGeneral} bg-blue-600 text-white shadow-blue-600/30 hover:bg-blue-500 hover:shadow-blue-500/40 focus-visible:ring-blue-500/60`;
        case 'secondary':
            return `${configGeneral} bg-slate-900 text-white shadow-slate-900/30 hover:bg-slate-800 hover:shadow-slate-900/40 focus-visible:ring-slate-500/60`;
        case 'success':
            return `${configGeneral} bg-teal-600 text-white shadow-teal-600/30 hover:bg-teal-500 hover:shadow-teal-500/40 focus-visible:ring-teal-500/60`;
        case 'error':
            return `${configGeneral} bg-rose-600 text-white shadow-rose-600/30 hover:bg-rose-500 hover:shadow-rose-500/40 focus-visible:ring-rose-500/60`;
        case 'outlined':
            return `${configGeneral} border border-slate-300 bg-transparent text-slate-700 shadow-none hover:bg-slate-50 hover:shadow-none focus-visible:ring-slate-300/70`;
        default:
            return `${configGeneral} bg-blue-600 text-white shadow-blue-600/30 hover:bg-blue-500 hover:shadow-blue-500/40 focus-visible:ring-blue-500/60`;
    }
};
