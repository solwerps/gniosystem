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
                    '!bg-slate-400 !cursor-not-allowed': loading || disabled
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
                <div className="absolute z-10 bg-background text-white py-1 px-2 text-sm rounded-md shadow-md bottom-10 left-1/2 transform -translate-x-1/2 min-w-24 ">
                    {text}
                </div>
            )}
        </button>
    );
};

const handleVariant = (variant: string) => {
    const configGeneral =
        'middle none center rounded-lg p-2 text-xs shadow-md transition-all hover:shadow-lg focus:opacity-[0.85] focus:shadow-none active:opacity-[0.85] active:shadow-none disabled:opacity-50 disabled:shadow-none max-h-[40px]';

    switch (variant) {
        case 'edit':
            // primary “fuerte”
            return `${configGeneral} bg-blue-600 text-white shadow-blue-500/20 hover:bg-blue-700 hover:shadow-blue-500/40`;
        case 'save':
            return `${configGeneral} bg-green-500 text-white shadow-green-500/20 hover:shadow-green-500/40`;
        case 'delete':
            return `${configGeneral} bg-red-500 text-white shadow-red-500/20 hover:shadow-red-500/40`;
        default:
            return `${configGeneral} bg-blue-600 text-white shadow-blue-500/20 hover:bg-blue-700 hover:shadow-blue-500/40`;
    }
};

const LoadIcon = () => {
    return (
        <svg
            className="animate-spin h-4 w-4 text-white"
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
