import React from 'react';

interface BadgeProps {
    text: string;
    variant:
        | 'default'
        | 'dark'
        | 'red'
        | 'green'
        | 'yellow'
        | 'indigo'
        | 'purple'
        | 'pink';
    className?: string;
}

const badgeStyles = {
    default: 'bg-blue-100 text-blue-800',
    dark: 'bg-gray-100 text-gray-800',
    red: 'bg-red-100 text-red-800',
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    indigo: 'bg-indigo-100 text-indigo-800',
    purple: 'bg-purple-100 text-purple-800 ',
    pink: 'bg-pink-100 text-pink-800 '
};

export const Tag: React.FC<BadgeProps> = ({ text, variant, className }) => {
    return (
        <span
            className={`${badgeStyles[variant]} text-xs font-medium px-2.5 py-0.5 rounded capitalize ${className}`}
        >
            {text}
        </span>
    );
};
