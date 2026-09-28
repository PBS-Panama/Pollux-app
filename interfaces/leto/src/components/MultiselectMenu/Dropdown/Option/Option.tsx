// Copyright (C) 2017-2024 Smart code 203358507
// R14: segunda pasada — indicador de selección extraído a su propio
// subcomponente (antes eran 2 bloques condicionales sueltos en el render),
// y clases CSS renombradas.

import React, { forwardRef, useCallback } from 'react';
import classNames from 'classnames';
import { Button } from 'pollux/components';
import Icon from 'pollux/common/Icon';
import styles from './Option.less';

type Props = {
    option: MultiselectMenuOption;
    selectedValue?: any;
    onSelect: (value: any) => void;
    multicheck?: boolean;
    isChecked?: boolean;
};

const isSelected = (option: MultiselectMenuOption, selectedValue: any, multicheck: boolean | undefined, isChecked: boolean | undefined) => (
    multicheck ? !!isChecked : option?.value === selectedValue
);

// En modo multicheck es un checkbox real; en modo selección simple, un
// puntito que solo aparece si esta opción no tiene submenú (`option.level`).
const SelectionIndicator = ({ multicheck, selected, hasSubmenu }: { multicheck?: boolean, selected: boolean, hasSubmenu: boolean }) => {
    if (multicheck) {
        return (
            <div className={classNames(styles['checkbox'], { [styles['checkbox-checked']]: selected })}>
                {selected && <Icon name={'checkmark'} className={styles['checkbox-icon']} />}
            </div>
        );
    }
    if (selected && !hasSubmenu) {
        return <div className={styles['selected-dot']} />;
    }
    return null;
};

const Option = forwardRef<HTMLButtonElement, Props>(({ option, selectedValue, onSelect, multicheck, isChecked }, ref) => {
    const selected = isSelected(option, selectedValue, multicheck, isChecked);
    const onClick = useCallback(() => onSelect(option.value), [onSelect, option.value]);
    const hasSubmenu = !!option.level;

    return (
        <Button
            ref={ref}
            className={classNames(styles['option-row'], { [styles['option-selected']]: selected })}
            onClick={onClick}
            aria-selected={selected}
        >
            <SelectionIndicator multicheck={multicheck} selected={selected} hasSubmenu={hasSubmenu} />
            <div className={styles['label']}>{option.label}</div>
            {hasSubmenu && <Icon name={'caret-right'} className={styles['expand-caret']} />}
        </Button>
    );
});

Option.displayName = 'Option';

export default Option;
