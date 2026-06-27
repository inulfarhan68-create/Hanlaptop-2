import React, { useState, useRef, useEffect } from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

interface AutocompleteProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  allowMultiple?: boolean;
}

export function Autocomplete({ options, value, onChange, placeholder, className, inputClassName, allowMultiple = false }: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter options based on input value
  const searchStr = allowMultiple ? (value.split(",").pop() || "").trim() : (value || "");
  const filteredOptions = options.filter(option => 
    option.toLowerCase().includes(searchStr.toLowerCase())
  );

  // Reset selected index when value changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [value]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => {
        const next = prev < filteredOptions.length - 1 ? prev + 1 : prev;
        scrollToIndex(next);
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => {
        const next = prev > 0 ? prev - 1 : 0;
        scrollToIndex(next);
        return next;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < filteredOptions.length) {
        handleSelect(filteredOptions[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  // Helper to scroll the active item into view
  const scrollToIndex = (index: number) => {
    if (listRef.current) {
      const element = listRef.current.children[index] as HTMLElement;
      if (element) {
        element.scrollIntoView({ block: "nearest" });
      }
    }
  };

  const handleSelect = (option: string) => {
    if (allowMultiple) {
      const parts = (value || "").split(",");
      parts.pop(); // remove the partial typing
      const newParts = parts.map(p => p.trim()).filter(Boolean);
      newParts.push(option);
      onChange(newParts.join(", ") + ", ");
    } else {
      onChange(option);
    }
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  // Helper to highlight matching text
  const highlightMatch = (text: string, highlight: string) => {
    if (!highlight) return text;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === highlight.toLowerCase() ? (
        <span key={i} className="font-bold text-primary">{part}</span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        className={inputClassName}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
      />
      
      {/* Dropdown Menu */}
      {isOpen && filteredOptions.length > 0 && (
        <div 
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground rounded-md border shadow-md max-h-60 overflow-auto animate-in fade-in-0 zoom-in-95"
        >
          {filteredOptions.map((option, index) => (
            <div
              key={index}
              className={cn(
                "px-3 py-2 cursor-pointer transition-colors text-sm",
                selectedIndex === index ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
              )}
              onClick={() => handleSelect(option)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              {highlightMatch(option, searchStr)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
