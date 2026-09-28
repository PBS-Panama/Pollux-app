// PBS Crewing Module: theme switcher for the company shell's Mannat skin
// (Reference/Frontend-UI). Four options, applied via a `data-pbs-theme`
// attribute on <html> — each theme just overrides the CSS custom properties
// declared in App/styles.less's :root (sidebar/topbar colors, etc.), so
// switching is a pure CSS operation with no per-component changes needed.

export type ThemeId = 'default' | 'navy' | 'dark' | 'dusk';

export const THEME_STORAGE_KEY = 'pbs-theme';
export const DEFAULT_THEME: ThemeId = 'default';

export const THEMES: { id: ThemeId, label: string, description: string, swatch: [string, string] }[] = [
    { id: 'default', label: 'Claro', description: 'Fondo claro, el diseño por defecto.', swatch: ['#f9fbfd', '#ffffff'] },
    { id: 'navy', label: 'Azul marino', description: 'Sidebar y topbar en azul marino, contenido claro.', swatch: ['#0f1b33', '#f4f6f9'] },
    { id: 'dark', label: 'Oscuro', description: 'Todo oscuro — menos luz de pantalla.', swatch: ['#141824', '#0d0f14'] },
    { id: 'dusk', label: 'Dusk', description: 'Intermedio entre claro y oscuro.', swatch: ['#232a38', '#2b3242'] },
];

const isValidTheme = (value: string | null): value is ThemeId => {
    return typeof value === 'string' && THEMES.some((theme) => theme.id === value);
};

export const getStoredTheme = (): ThemeId => {
    try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        return isValidTheme(stored) ? stored : DEFAULT_THEME;
    } catch {
        return DEFAULT_THEME;
    }
};

export const applyTheme = (theme: ThemeId): void => {
    document.documentElement.setAttribute('data-pbs-theme', theme);
    try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
        // ignore — theme just won't persist across reloads
    }
};

/** Call once, as early as possible (before React mounts), to avoid a flash
 * of the default theme before the stored preference is read. */
export const applyStoredTheme = (): void => {
    applyTheme(getStoredTheme());
};
