import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { interfaceLanguages, useLanguageSorting, useProfile } from 'pollux/common';

const useInterfaceOptions = () => {
    const { settings } = useProfile();
    const { i18n } = useTranslation();

    const interfaceLanguageOptions = useMemo(() =>
        interfaceLanguages.map(({ name, codes }) => ({
            value: codes[0],
            label: name,
        })),
    []);

    const { sortedOptions } = useLanguageSorting(interfaceLanguageOptions);

    const interfaceLanguageSelect = useMemo(() => ({
        options: sortedOptions,
        value:
            interfaceLanguages.find(({ codes }) => codes[1] === settings.interfaceLanguage)?.codes?.[0] ||
            settings.interfaceLanguage,
        onSelect: (value: string) => {
            // R2 fix, still true post-R8: call i18n.changeLanguage directly
            // so the switch is instant instead of waiting on the
            // subscription in useProfile() to re-render.
            i18n.changeLanguage(value);
            useProfile.updateSettings({ interfaceLanguage: value });
        }
    }), [settings.interfaceLanguage, sortedOptions, i18n]);

    return {
        interfaceLanguageSelect,
    };
};

export default useInterfaceOptions;
