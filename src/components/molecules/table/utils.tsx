
//src/components/molecules/table/utils.tsx
import { Text, Button, TrashIcon } from '@/components/atoms';

const NoDataComponent = ({
    text = 'No se encontraro coincidencias'
}: {
    text: string;
}) => {
    return (
        <div className="flex justify-center items-center w-full h-14">
            <Text variant="paragraph" italic>
                {text}
            </Text>
        </div>
    );
};

const LoadingComponent = () => {
    return (
        <div className="flex justify-center items-center min-h-64 w-full bg-white">
            <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-black"
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
            <span className="bold">Cargando...</span>
        </div>
    );
};

const FilledComponente = ({
    itemCounter,
    action = () => {}
}: {
    itemCounter: number;
    action?: () => void;
}) => {
    return (
        <div className="flex flex-col justify-center items-center min-h-64 w-full bg-white">
            <svg
                viewBox="0 0 512 512"
                className="w-20 h-20 text-basics-success"
                fill="currentColor"
            >
                <path d="M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-111 111-47-47c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9l64 64c9.4 9.4 24.6 9.4 33.9 0L369 209z" />
            </svg>
            <span className="bold text-2xl">Datos cargados correctamente!</span>
            <span className="italic text-xl text-slate-600">{`Documentos recolectados: ${itemCounter}`}</span>
            <Button
                icon
                onClick={action}
                variant='error'
                className='mt-2'
            >
                <TrashIcon />
                Descartar archivos
            </Button>
        </div>
    );
};

export { NoDataComponent, LoadingComponent, FilledComponente };
