import React from 'react';

interface HighlightProps {
    text: string;
    query: string;
}

const Highlight: React.FC<HighlightProps> = ({ text, query }) => {
    if (!query || !text) return <>{text}</>;

    // Escapar caracteres especiales y limpiar query
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));

    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === query.toLowerCase() ? (
                    <mark key={i} className="bg-[#FFBD00]/30 text-inherit font-bold rounded-sm px-0.5">
                        {part}
                    </mark>
                ) : (
                    part
                )
            )}
        </>
    );
};

export default Highlight;
