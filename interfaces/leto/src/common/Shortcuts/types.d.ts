// Refleja la forma real de shortcuts.json — la usan
// components/ShortcutsGroup/ShortcutsGroup.tsx (prop `shortcuts`) y
// Shortcuts.tsx (`grouped: ShortcutGroup[]` del contexto).
type Shortcut = {
    name: string,
    label: string,
    combos: string[][],
};

type ShortcutGroup = {
    name: string,
    label: string,
    shortcuts: Shortcut[],
};
