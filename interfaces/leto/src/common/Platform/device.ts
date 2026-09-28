import Bowser from 'bowser';

// El único consumidor real (Settings.tsx, vía usePlatform()) solo lee
// `isMobile` — `name`/`openExternal` que exportaba el original no tienen
// lectores (grep en todo el proyecto), se sacaron de acá y de Platform.tsx.
const APPLE_MOBILE_DEVICE_NAMES = new Set(['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod']);

const { userAgent, platform, maxTouchPoints } = globalThis.navigator;

// Detecta iPad correctamente en Safari (Bowser no lo hace bien ahí).
const isAppleMobileDevice = () => (
    APPLE_MOBILE_DEVICE_NAMES.has(platform) || (userAgent.includes('Mac') && 'ontouchend' in document)
);

// Vision Pro también pasa el chequeo de arriba (user agent "Macintosh"), pero
// no cuenta como "mobile" — se excluye aparte, como en el original.
const isVisionPro = () => userAgent.includes('Macintosh') && maxTouchPoints === 5;

const isAndroidDevice = () => Bowser.getParser(userAgent).getOSName().toLowerCase() === 'android';

const isMobile = !isVisionPro() && (isAppleMobileDevice() || isAndroidDevice());

export {
    isMobile,
};
