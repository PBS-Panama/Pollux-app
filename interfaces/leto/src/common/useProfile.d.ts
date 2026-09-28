type PolluxSettings = {
    interfaceLanguage: string,
};

interface UseProfile {
    (): { settings: PolluxSettings },
    readSettings: () => PolluxSettings,
    updateSettings: (partial: Partial<PolluxSettings>) => PolluxSettings,
}

declare const useProfile: UseProfile;
export = useProfile;
