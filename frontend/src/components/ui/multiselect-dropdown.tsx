import React, { useState, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { X, ChevronDown } from 'lucide-react';

interface Option {
  id: string;
  nome: string;
}

interface MultiSelectDropdownProps {
  options: Option[];
  selected: Option[];
  onChange: (selected: Option[]) => void;
  placeholder?: string;
  allowCreate?: boolean;
}

export function MultiSelectDropdown({ options, selected, onChange, placeholder = 'Selecione...', allowCreate = false }: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function normalize(str: string) {
    return str.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  }
  const lowerInput = normalize(input);
  const filtered = options.filter(opt => normalize(opt.nome).includes(lowerInput) && !selected.some(s => s.id === opt.id));
  const showOptions = input.trim() === '' ? options.filter(opt => !selected.some(s => s.id === opt.id)) : filtered;

  function handleSelect(opt: Option) {
    onChange([...selected, opt]);
    setInput('');
    if (inputRef.current) inputRef.current.focus();
  }
  function handleRemove(id: string) {
    onChange(selected.filter(s => s.id !== id));
    if (inputRef.current) inputRef.current.focus();
  }
  function handleCreate() {
    if (allowCreate && input.trim()) {
      const newOpt = { id: input.trim(), nome: input.trim() };
      onChange([...selected, newOpt]);
      setInput('');
      if (inputRef.current) inputRef.current.focus();
    }
  }

  // Popover deve abrir se input está focado ou há texto
  const popoverOpen = open || inputFocused || input.length > 0;

  return (
    <Popover open={popoverOpen} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          className="w-full border border-gray-300 rounded-lg px-3 py-2 flex flex-wrap items-center gap-2 gap-y-1 min-h-[42px] bg-white cursor-pointer focus-within:ring-2 focus-within:ring-gray-400 relative"
          tabIndex={0}
          onClick={() => {
            setOpen(true);
            if (inputRef.current) inputRef.current.focus();
          }}
        >
          {selected.map(opt => (
            <span key={opt.id} className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1 min-w-0 max-w-full truncate">
              <span className="truncate">{opt.nome}</span>
              <button type="button" onClick={e => { e.stopPropagation(); handleRemove(opt.id); }} className="ml-1 focus:outline-none hover:bg-blue-700 rounded-full p-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder={selected.length === 0 && input.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[60px] border-none outline-none bg-transparent text-gray-900 placeholder:text-gray-400 p-0 m-0"
            autoComplete="off"
            style={{ width: 'auto' }}
          />
          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] max-h-60 overflow-y-auto bg-white border border-gray-300 mt-2 rounded-lg p-2 text-gray-900 z-50">
        {showOptions.length === 0 && (!allowCreate || !input.trim()) && (
          <div className="text-xs text-gray-400 px-2 py-1">Nenhuma opção encontrada</div>
        )}
        {showOptions.map(opt => (
          <div
            key={opt.id}
            className="cursor-pointer px-2 py-1 rounded text-sm hover:bg-gray-100 hover:text-gray-900"
            onClick={() => handleSelect(opt)}
          >
            {opt.nome}
          </div>
        ))}
        {allowCreate && input.trim() && !options.some(o => normalize(o.nome) === lowerInput) && (
          <div
            className="cursor-pointer px-2 py-1 rounded text-sm text-blue-600 hover:bg-gray-100 hover:text-gray-900"
            onClick={handleCreate}
          >
            Criar "{input.trim()}"
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
} 