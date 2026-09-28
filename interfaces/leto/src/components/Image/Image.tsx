// PBS Crewing Module — imagen con fallback (R11, reescrita desde cero)
// Componente genérico: si `src` falla (o no viene), muestra `renderFallback()`
// si existe, si no `fallbackSrc`, si no simplemente no pinta nada raro.

import React, { useMemo, useState } from 'react';

type Props = {
    className: string,
    src: string,
    alt: string,
    fallbackSrc: string,
    renderFallback: () => React.ReactNode,
    onError: (event: React.SyntheticEvent<HTMLImageElement>) => void,
};

const Image = ({ className, src, alt, fallbackSrc, renderFallback, onError, ...props }: Props) => {
    const [failedSrc, setFailedSrc] = useState<string | null>(null);

    const hasFailed = failedSrc === src;
    const effectiveSrc = typeof src === 'string' && src.length > 0 && !hasFailed ? src : fallbackSrc;
    const showFallback = (!effectiveSrc || effectiveSrc === failedSrc) && typeof renderFallback === 'function';

    const handleError = (event: React.SyntheticEvent<HTMLImageElement>) => {
        setFailedSrc(src);
        if (typeof onError === 'function') {
            onError(event);
        }
    };

    if (showFallback) {
        return <>{renderFallback()}</>;
    }

    return (
        <img
            {...props}
            className={className}
            src={effectiveSrc}
            alt={alt}
            loading={'lazy'}
            onError={handleError}
        />
    );
};

export default Image;
