// Copyright (C) 2017-2024 Smart code 203358507

import { useEffect, useRef } from 'react';

const OUTSIDE_CLICK_EVENTS = ['mouseup', 'touchend'] as const;

// El callback se guarda en un ref (en vez de ir en las deps del efecto) para
// no desmontar/remontar los listeners del `document` cada vez que el
// consumidor pasa una nueva identidad de función.
const useOutsideClick = (callback: () => void) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const callbackRef = useRef(callback);
    callbackRef.current = callback;

    useEffect(() => {
        const onDocumentPointerUp = (event: MouseEvent | TouchEvent) => {
            const container = containerRef.current;
            if (container && !container.contains(event.target as Node)) {
                callbackRef.current();
            }
        };

        OUTSIDE_CLICK_EVENTS.forEach((eventName) => document.addEventListener(eventName, onDocumentPointerUp));
        return () => {
            OUTSIDE_CLICK_EVENTS.forEach((eventName) => document.removeEventListener(eventName, onDocumentPointerUp));
        };
    }, []);

    return containerRef;
};

export default useOutsideClick;
