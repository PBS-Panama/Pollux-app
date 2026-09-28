// `id`/`destination`/`default` no tienen ningún lector real (grep en
// MultiselectMenu/Dropdown/Option y en el único consumidor real,
// Settings > Interface) — se sacaron. `level` solo se lee como booleano
// (Option.tsx lo usa para decidir si pinta el ícono de "submenú"); el
// drill-down real (Dropdown.tsx) nunca llega a leer su contenido.
type MultiselectMenuOption = {
    label: string;
    value: string | number | null;
    hidden?: boolean;
    level?: unknown;
};
