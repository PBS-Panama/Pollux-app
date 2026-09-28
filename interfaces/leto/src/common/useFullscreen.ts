// PBS Crewing Module — fullscreen toggle
// R6: sin useShell.ts (era el WebView2/chrome.webview del shell de
// escritorio — Pollux es web-only, esa rama nunca corria). Solo queda la API
// nativa del navegador (Fullscreen API), que ya era la rama real usada en la
// practica.
// R8: sacado el chequeo de `settings.escExitFullscreen` — ese campo nunca
// existio de verdad (el toggle de Settings que lo hubiera seteado se borro
// en R6), así que la tecla Escape para salir de pantalla completa era
// inalcanzable desde siempre. La tecla "F" sigue igual.
// R14: los 2 consumidores reales (HorizontalNavBar.js, NavMenuContent.js)
// desestructuran solo `[fullscreen, requestFullscreen, exitFullscreen]` — el
// 4to valor (`toggleFullscreen`) que exponía el original no lo lee nadie
// desde afuera, aunque sigue haciendo falta adentro para la tecla "F".

import { useCallback, useEffect, useState } from 'react';

const isTypingTarget = (element: Element | null): boolean => (
    !!element && (
        element.tagName === 'INPUT'
        || element.tagName === 'TEXTAREA'
        || element.tagName === 'SELECT'
        || (element as HTMLElement).isContentEditable
    )
);

const useFullscreen = () => {
    const [fullscreen, setFullscreen] = useState(() => document.fullscreenElement === document.documentElement);

    const requestFullscreen = useCallback(async () => {
        try {
            await document.documentElement.requestFullscreen();
        } catch (err) {
            console.error('Error enabling fullscreen', err);
        }
    }, []);

    const exitFullscreen = useCallback(() => {
        if (document.fullscreenElement === document.documentElement) {
            document.exitFullscreen();
        }
    }, []);

    useEffect(() => {
        const syncFromDocument = () => setFullscreen(document.fullscreenElement === document.documentElement);

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.code !== 'KeyF' || isTypingTarget(document.activeElement)) {
                return;
            }
            if (document.fullscreenElement === document.documentElement) {
                exitFullscreen();
            } else {
                requestFullscreen();
            }
        };

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('fullscreenchange', syncFromDocument);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('fullscreenchange', syncFromDocument);
        };
    }, [requestFullscreen, exitFullscreen]);

    return [fullscreen, requestFullscreen, exitFullscreen] as const;
};

export default useFullscreen;
