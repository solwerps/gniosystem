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
                    'flex items-center justify-center gap-2': icon,
                    '!bg-slate-400 !cursor-not-allowed': loading || disabled
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
        'middle none center rounded-lg py-3 px-6 text-xs font-semibold shadow-md transition-all hover:shadow-lg focus:opacity-[0.85] focus:shadow-none active:opacity-[0.85] active:shadow-none disabled:opacity-50 disabled:shadow-none max-h-[40px]';

    switch (variant) {
        case 'primary':
            // aquí estaba “el malo”: usamos un azul fuerte fijo
            return `${configGeneral} bg-blue-600 text-white shadow-blue-500/20 hover:bg-blue-700 hover:shadow-blue-500/40`;
        case 'secondary':
            return `${configGeneral} bg-background text-white shadow-blue-500/20 hover:shadow-blue-500/40`;
        case 'success':
            return `${configGeneral} bg-green-500 text-white shadow-green-500/20 hover:shadow-green-500/40`;
        case 'error':
            return `${configGeneral} bg-red-500 text-white shadow-red-500/20 hover:shadow-red-500/40`;
        case 'outlined':
            return 'transition duration-200 mx-5 px-5 py-4 cursor-pointer font-normal text-sm rounded-lg text-gray-500 hover:bg-gray-100 focus:outline-none focus:bg-gray-200 focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50 ring-inset';
        default:
            return `${configGeneral} bg-blue-600 text-white shadow-blue-500/20 hover:bg-blue-700 hover:shadow-blue-500/40`;
    }
};
