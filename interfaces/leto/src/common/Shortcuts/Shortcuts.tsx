import React, { createContext, useCallback, useContext, useEffect } from 'react';
import shortcutGroups from './shortcuts.json';

export type ShortcutName = string;

type FlatShortcut = { name: string, combos: string[][] };

const FLAT_SHORTCUTS: FlatShortcut[] = shortcutGroups.flatMap((group) => group.shortcuts);

// Si el combo no pide ese modificador, no importa si está apretado o no —
// así se comportaba el original: un atajo sin "Ctrl" en su lista también
// dispara con Ctrl apretado. Se preserva tal cual, no es un bug que corregí.
const passesModifier = (required: boolean, pressed: boolean) => !required || pressed;

const matchesEvent = (event: KeyboardEvent, combo: string[]) => (
    passesModifier(combo.includes('Ctrl'), event.ctrlKey)
    && passesModifier(combo.includes('Shift'), event.shiftKey)
    && (combo.includes(event.code) || combo.includes(event.key.toUpperCase()))
);

const ShortcutsContext = createContext({ grouped: shortcutGroups });

type Props = {
    children: JSX.Element,
    onShortcut: (name: ShortcutName) => void,
};

// El único consumidor real de `useShortcuts()` lee `grouped` (para pintar la
// lista de atajos en Settings y en el modal, App/ShortcutsModal) — la
// suscripción por nombre (`on`/`off`) que tenía el original no la usa nadie
// (grep en todo el proyecto), se sacó junto con el hook `onShortcut.ts` que
// dependía de ella.
const ShortcutsProvider = ({ children, onShortcut }: Props) => {
    const onKeyDown = useCallback((event: KeyboardEvent) => {
        for (const { name, combos } of FLAT_SHORTCUTS) {
            if (combos.some((combo) => matchesEvent(event, combo))) {
                onShortcut(name);
            }
        }
    }, [onShortcut]);

    useEffect(() => {
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [onKeyDown]);

    return (
        <ShortcutsContext.Provider value={{ grouped: shortcutGroups }}>
            {children}
        </ShortcutsContext.Provider>
    );
};

const useShortcuts = () => useContext(ShortcutsContext);

export {
    ShortcutsProvider,
    useShortcuts,
};
