import { Inter, Montserrat, Roboto, Merriweather } from 'next/font/google';

export const montserrat = Montserrat({
    subsets: ['latin'],
    weight: ['200', '300', '400', '500', '600', '700']
});
export const roboto = Roboto({
    subsets: ['latin'],
    weight: ['100', '300', '400', '500', '700', '900']
});
export const inter = Inter({
    subsets: ['latin'],
    weight: ['100', '300', '400', '500', '700', '900']
});

export const merriweather = Merriweather({
    subsets: ['latin'],
    weight: ['300', '400', '700', '900']
});
