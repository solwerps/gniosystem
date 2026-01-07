import React from 'react';
import clsx from 'clsx';

const variantClasses = {
    gray: {
        background: 'bg-gray-50',
        text: 'text-gray-600',
        ring: 'ring-gray-500/10'
    },
    danger: {
        background: 'bg-red-50',
        text: 'text-red-700',
        ring: 'ring-red-600/10'
    },
    warning: {
        background: 'bg-yellow-50',
        text: 'text-yellow-800',
        ring: 'ring-yellow-600/20'
    },
    success: {
        background: 'bg-green-50',
        text: 'text-green-700',
        ring: 'ring-green-600/20'
    },
    info: {
        background: 'bg-blue-50',
        text: 'text-blue-700',
        ring: 'ring-blue-700/10'
    },
    indigo: {
        background: 'bg-indigo-50',
        text: 'text-indigo-700',
        ring: 'ring-indigo-700/10'
    },
    purple: {
        background: 'bg-purple-50',
        text: 'text-purple-700',
        ring: 'ring-purple-700/10'
    },
    pink: {
        background: 'bg-pink-50',
        text: 'text-pink-700',
        ring: 'ring-pink-700/10'
    }
} as const;

type Variant = keyof typeof variantClasses;

interface BadgeProps {
    variant?: Variant;
    children?: React.ReactNode;
    className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
    variant = 'gray',
    children = 'Badge',
    className
}) => {
    const classes = variantClasses[variant];

    return (
        <span
            className={clsx(
                'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset',
                classes.background,
                classes.text,
                classes.ring,
                className
            )}
        >
            {children}
        </span>
    );
};
