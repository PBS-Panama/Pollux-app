import React, { useCallback, useState } from 'react';
import classnames from 'classnames';
import { THEMES, getStoredTheme, applyTheme } from 'pollux/common';
import type { ThemeId } from 'pollux/common/theme';
import styles from './ThemeSwitcher.less';

const ThemeSwitcher = () => {
    const [selected, setSelected] = useState<ThemeId>(getStoredTheme);
    const onSelect = useCallback((id: ThemeId) => {
        applyTheme(id);
        setSelected(id);
    }, []);
    return (
        <div className={styles['theme-switcher']}>
            {
                THEMES.map((theme) => (
                    <button
                        key={theme.id}
                        type={'button'}
                        title={theme.description}
                        className={classnames(styles['theme-option'], { [styles['selected']]: theme.id === selected })}
                        onClick={() => onSelect(theme.id)}
                    >
                        <span className={styles['swatch']}>
                            <span className={styles['swatch-half']} style={{ backgroundColor: theme.swatch[0] }} />
                            <span className={styles['swatch-half']} style={{ backgroundColor: theme.swatch[1] }} />
                        </span>
                        <span className={styles['swatch-label']}>{theme.label}</span>
                    </button>
                ))
            }
        </div>
    );
};

export default ThemeSwitcher;
