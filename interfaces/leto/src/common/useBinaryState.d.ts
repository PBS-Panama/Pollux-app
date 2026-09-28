// Shim de tipos para useBinaryState.js (JS plano, checkJs:false) — el único
// motivo de que este archivo exista es que MultiselectMenu.tsx (.tsx real)
// importa el hook y necesita saber su forma. El tipo lo dicta la firma real
// del hook, no queda margen para "diseñarlo distinto".
type BinaryStateTuple = [value: boolean, on: () => void, off: () => void, toggle: () => void];
declare function useBinaryState(initialValue?: boolean): BinaryStateTuple;

export default useBinaryState;
