//src/components/atom/text/Text.tsx
import React from 'react';
import clsx from 'clsx';
import { montserrat } from '@/utils/fonts';

interface TextProps {
    children: React.ReactNode;
    variant: 'title' | 'subtitle' | 'text' | 'paragraph' | 'small';
    className?: string;
    bold?: boolean;
    semibold?: boolean;
    italic?: boolean;
    underline?: boolean;
}

export const Text: React.FC<TextProps> = ({
    children,
    variant,
    className,
    bold,
    semibold,
    italic,
    underline
}) => {
    const baseClasses = {
        title: 'text-3xl md:text-4xl leading-tight tracking-[-0.02em] text-slate-900',
        subtitle: 'text-xl md:text-2xl leading-snug tracking-[-0.01em] text-slate-800',
        text: 'text-base leading-6 text-slate-700',
        paragraph: 'text-base leading-7 text-slate-700 my-2',
        small: 'text-sm leading-5 text-slate-600'
    };

    return (
        <div
            className={clsx(
                'font-medium',
                baseClasses[variant],
                montserrat.className,
                [
                    {
                        'font-bold': bold,
                        'font-semibold': semibold,
                        underline: underline,
                        italic: italic
                    }
                ],
                className
            )}
        >
            {children}
        </div>
    );
};
