// Copyright (C) 2017-2024 Smart code 203358507

import React, { useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import { Button } from 'pollux/components';
import Icon from 'pollux/common/Icon';
import Option from './Option';
import styles from './Dropdown.less';

type Props = {
    options: MultiselectMenuOption[];
    value?: any;
    menuOpen: boolean | (() => void);
    level: number;
    onBack: () => void;
    onSelect: (value: any) => void;
    multicheck?: boolean;
    selectedValues?: Set<string>;
};

const useScrollSelectedIntoView = (menuOpen: Props['menuOpen'], selectedValue: any) => {
    const optionNodes = useRef(new Map<any, HTMLButtonElement>());
    const registerOption = useCallback((optionValue: any) => (node: HTMLButtonElement | null) => {
        if (node) {
            optionNodes.current.set(optionValue, node);
        } else {
            optionNodes.current.delete(optionValue);
        }
    }, []);

    useEffect(() => {
        if (!menuOpen) return;
        const node = optionNodes.current.get(selectedValue);
        node?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [menuOpen, selectedValue]);

    return registerOption;
};

const Dropdown = ({ level, onBack, options, onSelect, value, menuOpen, multicheck, selectedValues }: Props) => {
    const { t } = useTranslation();
    const registerOption = useScrollSelectedIntoView(menuOpen, value);
    const visibleOptions = options.filter((option) => !option.hidden);

    return (
        <div className={classNames(styles['dropdown'], { [styles['open']]: menuOpen })} role={'listbox'}>
            {level > 0 && (
                <Button className={styles['back-button']} onClick={onBack}>
                    <Icon name={'caret-left'} className={styles['back-button-icon']} />
                    {t('BACK')}
                </Button>
            )}
            {visibleOptions.map((option) => (
                <Option
                    key={option.value}
                    ref={registerOption(option.value)}
                    option={option}
                    onSelect={onSelect}
                    selectedValue={value}
                    multicheck={multicheck}
                    isChecked={multicheck ? selectedValues?.has(String(option.value)) ?? false : undefined}
                />
            ))}
        </div>
    );
};

export default Dropdown;
