import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import path from 'path';

export default async function i18n(language: string = 'es-ES', key: string, options?: Record<string, string>) {
    try {
        const loadPath = path.resolve(__dirname, `../../../i18n/{{lng}}.json`);

        const i18nInstance = await i18next
            .use(Backend)
            .init({
                lng: language,
                fallbackLng: 'es-ES',
                preload: ['es-ES', 'en-US'],
                backend: {
                    loadPath,
                },
                interpolation: {
                    escapeValue: false, // No escapar valores por defecto (útil en React)
                },
            });

        return i18nInstance(key, {
            ...options
        });
    } catch (error) {
        console.error('Error initializing i18next:', error);
        throw error;
    }
}
