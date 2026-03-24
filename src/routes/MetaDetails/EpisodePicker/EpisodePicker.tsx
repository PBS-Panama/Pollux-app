// PBS Crewing Module: Document Picker (category + document number)
// Replaces Stremio's EpisodePicker — navigates to a specific document

import React, { useCallback, useMemo, useState, ChangeEvent } from 'react';
import { Button, NumberInput } from 'stremio/components';
import styles from './EpisodePicker.less';

type Props = {
    className?: string,
    crewId: string;
    onSubmit: (category: number, docIndex: number) => void;
};

const DocumentPicker = ({ className, onSubmit }: Props) => {
    const { initialCategory, initialDoc } = useMemo(() => {
        const splitPath = window.location.hash.split('/');
        if (splitPath[splitPath.length - 1] === '') {
            splitPath.pop();
        }
        const documentId = decodeURIComponent(splitPath[splitPath.length - 1]);
        const [, pathCategory, pathDoc] = documentId ? documentId.split(':') : [];
        return {
            initialCategory: parseInt(pathCategory) || 1,
            initialDoc: parseInt(pathDoc) || 1
        };
    }, []);

    const [category, setCategory] = useState(initialCategory);
    const [docIndex, setDocIndex] = useState(initialDoc);

    const handleCategoryChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setCategory(parseInt(event.target.value));
    }, []);

    const handleDocChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setDocIndex(parseInt(event.target.value));
    }, []);

    const handleSubmit = () => {
        onSubmit(category, docIndex);
    };

    const disabled = category === initialCategory && docIndex === initialDoc;

    return (
        <div className={className}>
            <NumberInput
                min={1}
                label={'Category'}
                defaultValue={category}
                onChange={handleCategoryChange}
                showButtons
            />
            <NumberInput
                min={1}
                label={'Document'}
                defaultValue={docIndex}
                onChange={handleDocChange}
                showButtons
            />
            <Button
                className={styles['button-container']}
                onClick={handleSubmit}
                disabled={disabled}
            >
                <div className={styles['label']}>{'Show Documents'}</div>
            </Button>
        </div>
    );
};

export default DocumentPicker;
