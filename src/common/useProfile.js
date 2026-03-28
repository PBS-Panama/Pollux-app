// Copyright (C) 2017-2023 Smart code 203358507

const useModelState = require('leto/common/useModelState');

// Stable sentinel — same reference every render so deepEqual short-circuits on ===
const NEVER_DISMISSED = new Date(NaN);

const map = (ctx) => ({
    ...ctx.profile,
    settings: {
        ...ctx.profile.settings,
        streamingServerWarningDismissed:
            typeof ctx.profile.settings.streamingServerWarningDismissed === 'string' ?
                new Date(ctx.profile.settings.streamingServerWarningDismissed)
                : NEVER_DISMISSED
    }
});

const useProfile = () => {
    return useModelState({ model: 'ctx', map });
};

module.exports = useProfile;
