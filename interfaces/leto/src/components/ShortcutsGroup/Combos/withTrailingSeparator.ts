import { ReactNode } from 'react';

// Combos.tsx (separador "o" entre combinaciones) y Keys.tsx (separador "+"
// entre teclas) tenían cada uno su propio chequeo repetido de "¿soy el
// último elemento?" para decidir si van seguidos de un separador. Se
// extrajo acá una sola vez: recorre la lista y le pasa a `renderItem` el
// separador que le toca (o `null` si es el último), en vez de que cada
// consumidor repita la comparación de índices.
const withTrailingSeparator = <T,>(
    items: T[],
    renderItem: (item: T, index: number, separator: ReactNode) => ReactNode,
    renderSeparator: (index: number) => ReactNode,
): ReactNode[] => items.map((item, index) => (
    renderItem(item, index, index < items.length - 1 ? renderSeparator(index) : null)
));

export default withTrailingSeparator;
