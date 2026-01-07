//src/components/molecules/modal/ContinueModal.tsx
'use client';
import React from 'react';
import { Modal } from './Modal';
import { Button } from '@/components/atoms';
import { useRouter } from 'next/navigation';

interface Props {
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    href: string;
    text?: string;
    continueAction: () => void;
}

export const ContinueModal = ({
    isOpen,
    setIsOpen,
    text = 'Quiere continuar?',
    href,
    continueAction
}: Props) => {
    const router = useRouter();

    const backHref = () => {
        router.push(href);
    };

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} title="Continuar" dontClose>
            <div className="flex flex-col justify-center items-center py-4">
                <p className="text-center mb-2">{text}</p>
            </div>
            <div className="flex border-t pt-4 gap-2 justify-end">
                <Button onClick={backHref} variant="error">
                    No
                </Button>
                <Button onClick={continueAction} variant="success">
                    Continuar
                </Button>
            </div>
        </Modal>
    );
};
