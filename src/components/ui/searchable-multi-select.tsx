import React, { useState, useRef, useEffect } from 'react';
import { Check, X, Search, Plus, ChevronDown } from 'lucide-react';

export interface SelectOption {
  id: string;
  name: string;
  description?: string | null;
}

interface SearchableMultiSelectProps {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  selectedIds: string[];
  onChange: (selectedIds: string[], selectedNames: string[]) => void;
  onCreateNew?: (name: string) => Promise<SelectOption | null>;
  variant?: 'strategy' | 'tag' | 'mistake';
  disabled?: boolean;
}

export function SearchableMultiSelect({
  label,
  placeholder = 'Select items...',
  options,
  selectedIds,
  onChange,
  onCreateNew,
  variant = 'tag',
  disabled = false,
}: SearchableMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOptions = options.filter((opt) => selectedIds.includes(opt.id));

  // If there are IDs selected that don't match known options (e.g. legacy string names),
  // generate fallback items so they are still visible
  const missingSelected = selectedIds.filter(
    (id) => !options.some((opt) => opt.id === id || opt.name.toLowerCase() === id.toLowerCase())
  );

  const filteredOptions = options.filter((opt) =>
    opt.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const exactMatchExists = options.some(
    (opt) => opt.name.toLowerCase() === searchQuery.trim().toLowerCase()
  );

  const handleToggle = (opt: SelectOption) => {
    const isAlready = selectedIds.includes(opt.id);
    let nextIds: string[];
    if (isAlready) {
      nextIds = selectedIds.filter((id) => id !== opt.id);
    } else {
      nextIds = [...selectedIds, opt.id];
    }
    const nextNames = options.filter((o) => nextIds.includes(o.id)).map((o) => o.name);
    onChange(nextIds, nextNames);
  };

  const handleRemove = (idToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextIds = selectedIds.filter((id) => id !== idToRemove);
    const nextNames = options.filter((o) => nextIds.includes(o.id)).map((o) => o.name);
    onChange(nextIds, nextNames);
  };

  const handleCreateNew = async () => {
    if (!onCreateNew || !searchQuery.trim() || isCreating) return;
    setIsCreating(true);
    try {
      const created = await onCreateNew(searchQuery.trim());
      if (created) {
        const nextIds = [...selectedIds, created.id];
        const nextNames = [...selectedOptions.map((o) => o.name), created.name];
        onChange(nextIds, nextNames);
        setSearchQuery('');
      }
    } catch {
      // non-fatal
    } finally {
      setIsCreating(false);
    }
  };

  const getBadgeStyle = () => {
    switch (variant) {
      case 'strategy':
        return 'bg-emerald-950/70 border-emerald-800/80 text-emerald-300';
      case 'mistake':
        return 'bg-rose-950/70 border-rose-800/80 text-rose-300';
      case 'tag':
      default:
        return 'bg-sky-950/70 border-sky-800/80 text-sky-300';
    }
  };

  return (
    <div className="space-y-1.5" ref={containerRef}>
      {label && <label className="text-xs font-medium text-zinc-300">{label}</label>}

      {/* Main Trigger / Chip Field */}
      <div
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        className={`min-h-[38px] w-full rounded-md border border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5 text-xs shadow-sm transition-colors cursor-pointer flex flex-wrap items-center gap-1.5 ${
          isOpen ? 'ring-1 ring-zinc-700 border-zinc-700' : 'hover:border-zinc-750'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {selectedOptions.length === 0 && missingSelected.length === 0 && (
          <span className="text-zinc-500 font-mono text-[11px] select-none py-0.5">
            {placeholder}
          </span>
        )}

        {/* Selected Badges */}
        {selectedOptions.map((opt) => (
          <span
            key={opt.id}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono border ${getBadgeStyle()}`}
          >
            <span>{opt.name}</span>
            <button
              type="button"
              onClick={(e) => handleRemove(opt.id, e)}
              className="hover:text-white rounded-full p-0.5 transition-colors"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}

        {missingSelected.map((legacyName) => (
          <span
            key={legacyName}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono border ${getBadgeStyle()}`}
          >
            <span>{legacyName}</span>
            <button
              type="button"
              onClick={(e) => handleRemove(legacyName, e)}
              className="hover:text-white rounded-full p-0.5 transition-colors"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}

        <div className="ml-auto flex items-center gap-1 pl-1 text-zinc-500">
          <ChevronDown className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="relative z-50">
          <div className="absolute left-0 right-0 top-1 rounded-md border border-zinc-800 bg-zinc-900 shadow-xl p-2 space-y-2 backdrop-blur-md">
            {/* Search Input */}
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (!exactMatchExists && searchQuery.trim() && onCreateNew) {
                      handleCreateNew();
                    }
                  } else if (e.key === 'Escape') {
                    setIsOpen(false);
                  }
                }}
                placeholder="Search or type to create..."
                className="w-full h-8 pl-8 pr-2.5 text-xs bg-zinc-950 border border-zinc-800 rounded text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 font-mono"
              />
            </div>

            {/* Options List */}
            <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
              {filteredOptions.length === 0 && !searchQuery.trim() && (
                <div className="py-3 text-center text-xs text-zinc-500 font-mono">
                  No items available.
                </div>
              )}

              {filteredOptions.map((opt) => {
                const isSelected = selectedIds.includes(opt.id);
                return (
                  <div
                    key={opt.id}
                    onClick={() => handleToggle(opt)}
                    className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-xs transition-colors ${
                      isSelected
                        ? 'bg-zinc-800/80 text-zinc-100 font-medium'
                        : 'text-zinc-300 hover:bg-zinc-800/50 hover:text-white'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-mono text-xs">{opt.name}</span>
                      {opt.description && (
                        <span className="text-[10px] text-zinc-500 line-clamp-1">
                          {opt.description}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-2" />
                    )}
                  </div>
                );
              })}

              {/* Create new option */}
              {searchQuery.trim() && !exactMatchExists && onCreateNew && (
                <button
                  type="button"
                  onClick={handleCreateNew}
                  disabled={isCreating}
                  className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-emerald-400 hover:bg-emerald-950/40 rounded border border-dashed border-emerald-900/60 font-mono transition-colors text-left"
                >
                  <Plus className="w-3 h-3" />
                  <span>
                    Create &quot;<strong className="text-emerald-300">{searchQuery.trim()}</strong>&quot;
                  </span>
                </button>
              )}
            </div>

            {/* Quick Actions Footer */}
            <div className="pt-1.5 border-t border-zinc-800 flex items-center justify-between text-[10px] text-zinc-500 font-mono px-1">
              <span>{selectedIds.length} selected</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="hover:text-zinc-300 underline underline-offset-2"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
