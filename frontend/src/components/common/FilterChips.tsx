import React from 'react';

interface FilterChip {
    id: string;
    label: string;
    value: string;
}

interface FilterChipsProps {
    chips: FilterChip[];
    onRemove: (id: string) => void;
    onClearAll: () => void;
}

const FilterChips: React.FC<FilterChipsProps> = ({ chips, onRemove, onClearAll }) => {
    if (chips.length === 0) return null;

    return (
        <div className="flex flex-wrap items-center gap-2 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mr-1">Filtros Activos:</span>

            {chips.map((chip) => (
                <div
                    key={chip.id}
                    className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full border border-primary/20 shadow-sm"
                >
                    <span className="text-[10px] font-bold uppercase tracking-tight">{chip.label}:</span>
                    <span className="text-xs font-bold">{chip.value}</span>
                    <button
                        onClick={() => onRemove(chip.id)}
                        className="size-4 flex items-center justify-center rounded-full hover:bg-primary/20 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                </div>
            ))}

            {chips.length > 1 && (
                <button
                    onClick={onClearAll}
                    className="text-[10px] font-black text-destructive uppercase tracking-widest hover:underline ml-2"
                >
                    Limpiar Todo
                </button>
            )}
        </div>
    );
};

export default FilterChips;
