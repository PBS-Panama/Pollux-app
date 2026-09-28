import { useMemo } from 'react';
import interfaceLanguages from 'pollux/common/interfaceLanguages.json';

// El único consumidor real (Settings > Interface, useInterfaceOptions.ts)
// solo lee `sortedOptions` — `userLangCode`/`isLanguageDropdown` que
// devolvía el original no los lee nadie (grep en todo el proyecto), se
// sacaron.
const browserLanguageCodes = (): string[] => {
    const lang = interfaceLanguages.find((l) => l.codes.includes(navigator.language || 'en-US'));
    if (!lang) return ['eng'];
    return [lang.codes[1] || 'eng', navigator.language || 'en-US'];
};

const useLanguageSorting = (options: MultiselectMenuOption[]) => {
    const sortedOptions = useMemo(() => {
        const codes = browserLanguageCodes();
        const matchingIndex = options.findIndex((option) => {
            const lang = interfaceLanguages.find((l) => l.name === option.label);
            return codes.some((code) => lang?.codes.includes(code));
        });

        if (matchingIndex === -1) {
            return [...options].sort((a, b) => a.label.localeCompare(b.label));
        }

        const matchingOption = options[matchingIndex];
        const otherOptions = options
            .filter((_, index) => index !== matchingIndex)
            .sort((a, b) => a.label.localeCompare(b.label));

        return [matchingOption, ...otherOptions];
    }, [options]);

    return { sortedOptions };
};

export default useLanguageSorting;
