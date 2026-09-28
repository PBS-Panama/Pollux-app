import React, { createContext, useContext } from 'react';
import { isMobile } from './device';

const PlatformContext = createContext({ isMobile });

type Props = {
    children: JSX.Element,
};

const PlatformProvider = ({ children }: Props) => (
    <PlatformContext.Provider value={{ isMobile }}>
        {children}
    </PlatformContext.Provider>
);

const usePlatform = () => useContext(PlatformContext);

export {
    PlatformProvider,
    usePlatform,
};
