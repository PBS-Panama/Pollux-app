import React, { useMemo, useReducer } from 'react';
import classNames from 'classnames';
import { Button } from 'pollux/components';
import useOutsideClick from 'pollux/common/useOutsideClick';
import Icon from 'pollux/common/Icon';
import Dropdown from './Dropdown';
import styles from './MultiselectMenu.less';

type Props = {
    className?: string,
    title?: string | (() => string | null);
    options: MultiselectMenuOption[];
    value?: any;
    disabled?: boolean,
    multicheck?: boolean;
    selectedValues?: Set<string>;
    onSelect: (value: any) => void;
    onToggle?: (value: string) => void;
};

// El único consumidor real hoy (Settings > Interface, selector de idioma) usa
// opciones planas y nunca pasa `multicheck` — el drill-down por niveles y el
// modo multicheck vienen intactos de Stremio, sin ejercitar. Se preserva el
// contrato tal cual.
const resolveButtonLabel = (title: Props['title'], selectedOption: MultiselectMenuOption | undefined, multicheck: boolean | undefined, selectedValues: Set<string> | undefined) => {
    const base = typeof title === 'function' ? title() : title ?? selectedOption?.label;
    if (multicheck && selectedValues && selectedValues.size > 0) {
        return `${base} (${selectedValues.size})`;
    }
    return base;
};

type MenuState = { open: boolean, level: number };
type MenuAction = { type: 'toggle' } | { type: 'close' } | { type: 'drillIn' } | { type: 'goBack' };

// R14, segundo intento: `open` y `level` vivían en 2 estados separados
// (useBinaryState + useState), y cerrar el menú nunca reseteaba `level` —
// si alguien llegaba a drillear a un submenú y cerraba, la próxima apertura
// arrancaba en ese mismo nivel en vez de la raíz. Un solo reducer los junta
// y hace que cerrar (o volver a abrir) siempre vuelva a nivel 0.
const menuReducer = (state: MenuState, action: MenuAction): MenuState => {
    switch (action.type) {
        case 'toggle': return { open: !state.open, level: 0 };
        case 'close': return { open: false, level: 0 };
        case 'drillIn': return { ...state, level: state.level + 1 };
        case 'goBack': return { ...state, level: Math.max(0, state.level - 1) };
        default: return state;
    }
};

const MultiselectMenu = ({ className, title, options, value, disabled, multicheck, selectedValues, onSelect, onToggle }: Props) => {
    const [{ open, level }, dispatch] = useReducer(menuReducer, { open: false, level: 0 });
    const closeMenu = () => dispatch({ type: 'close' });
    const multiselectMenuRef = useOutsideClick(closeMenu);

    const selectedOption = options.find((option) => option.value === value);
    const buttonLabel = useMemo(
        () => resolveButtonLabel(title, selectedOption, multicheck, selectedValues),
        [title, selectedOption, multicheck, selectedValues]
    );

    const onOptionSelect = (selectedValue: string | number) => {
        if (multicheck && onToggle) {
            onToggle(String(selectedValue));
            return;
        }
        if (level > 0) {
            dispatch({ type: 'drillIn' });
        } else {
            onSelect(selectedValue);
        }
        closeMenu();
    };

    return (
        <div className={classNames(styles['multiselect-container'], { [styles['menu-active']]: open }, className)} ref={multiselectMenuRef}>
            <Button
                className={styles['multiselect-trigger']}
                disabled={disabled}
                onClick={() => dispatch({ type: 'toggle' })}
                tabIndex={0}
                aria-haspopup='listbox'
                aria-expanded={open}
            >
                <div className={styles['trigger-label']}>{buttonLabel}</div>
                <Icon name={'caret-down'} className={classNames(styles['trigger-icon'], { [styles['icon-open']]: open })} />
            </Button>
            {open && (
                <Dropdown
                    level={level}
                    onBack={() => dispatch({ type: 'goBack' })}
                    options={options}
                    onSelect={onOptionSelect}
                    menuOpen={open}
                    value={value}
                    multicheck={multicheck}
                    selectedValues={selectedValues}
                />
            )}
        </div>
    );
};

export default MultiselectMenu;
