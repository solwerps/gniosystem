'use client';

import clsx from 'clsx';
import React, { ReactNode } from 'react';

interface Props {
    icon: ReactNode;
    title: string;
    action: any;
}

export const NavButton: React.FC<Props> = ({ icon, title, action }) => {
    return (
        <li
            className={clsx(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-200/90 transition-colors duration-200 hover:bg-white/10 hover:text-white cursor-pointer'
            )}
            onClick={action}
        >
            {icon}
            <span className="truncate">{title}</span>
        </li>
    );
};
