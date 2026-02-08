'use client';
import React, { useState } from 'react';
import clsx from 'clsx';

interface Props {
    icon: React.ReactNode;
    text: string;
    variant?: 'edit' | 'delete' | 'save';
    loading?: boolean;
    disabled?: boolean;
    onClick?: React.MouseEventHandler<HTMLButtonElement> | undefined;
    className?: string | undefined;
}

export const ActionButton = ({
    icon,
    text,
    variant = 'edit',
    loading,
    disabled,
    onClick,
    className = ''
}: Props) => {
    const [isTooltipVisible, setIsTooltipVisible] = useState(false);

    return (
        <button
            className={clsx(
                'relative inline-block',
                handleVariant(variant),
                {
                    '!bg-slate-200 !text-slate-500 !shadow-none !cursor-not-allowed':
                        loading || disabled
                },
                className
            )}
            disabled={loading || disabled}
            onClick={onClick}
            onMouseEnter={() => setIsTooltipVisible(true)}
            onMouseLeave={() => setIsTooltipVisible(false)}
            type="button"
        >
            <div className="inline-flex items-center justify-center">
                {loading ? <LoadIcon /> : icon}
            </div>
            {isTooltipVisible && !loading && !disabled && (
                <div className="absolute z-10 rounded-md border border-white/10 bg-slate-950/90 px-2 py-1 text-xs font-medium text-slate-100 shadow-xl bottom-10 left-1/2 transform -translate-x-1/2 min-w-24">
                    {text}
                </div>
            )}
        </button>
    );
};

const handleVariant = (variant: string) => {
    const configGeneral =
        'inline-flex items-center justify-center rounded-xl p-2.5 text-xs font-semibold tracking-[0.02em] shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] disabled:opacity-60 disabled:cursor-not-allowed';

    switch (variant) {
        case 'edit':
            return `${configGeneral} bg-slate-900 text-white shadow-slate-900/30 hover:bg-slate-800 hover:shadow-slate-900/40 focus-visible:ring-slate-500/60`;
        case 'save':
            return `${configGeneral} bg-teal-600 text-white shadow-teal-600/30 hover:bg-teal-500 hover:shadow-teal-500/40 focus-visible:ring-teal-500/60`;
        case 'delete':
            return `${configGeneral} bg-rose-600 text-white shadow-rose-600/30 hover:bg-rose-500 hover:shadow-rose-500/40 focus-visible:ring-rose-500/60`;
        default:
            return `${configGeneral} bg-slate-900 text-white shadow-slate-900/30 hover:bg-slate-800 hover:shadow-slate-900/40 focus-visible:ring-slate-500/60`;
    }
};

const LoadIcon = () => {
    return (
        <svg
            className="h-4 w-4 animate-spin text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
        >
            <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
            ></circle>
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
        </svg>
    );
};
