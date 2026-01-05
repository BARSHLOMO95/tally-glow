import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FilterState, InvoiceStatus, BusinessType } from '@/types/invoice';
import { ChevronDown, ChevronUp, Filter, Edit, Trash2, Printer, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterPanelProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  filterOptions: {
    intakeMonths: string[];
    documentMonths: string[];
    statuses: InvoiceStatus[];
    suppliers: string[];
    categories: string[];
    businessTypes: BusinessType[];
  };
  selectedCount: number;
  onBulkEdit: () => void;
  onBulkDelete: () => void;
  onPrint: () => void;
  onClearFilters: () => void;
}

type FilterKey = keyof FilterState;

interface MultiSelectFilterProps<T extends string> {
  label: string;
  options: T[];
  selected: T[];
  onChange: (selected: T[]) => void;
}

function MultiSelectFilter<T extends string>({ label, options, selected, onChange }: MultiSelectFilterProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  
  const isAllSelected = selected.length === options.length && options.length > 0;
  const isPartiallySelected = selected.length > 0 && selected.length < options.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      onChange([]);
    } else {
      onChange([...options]);
    }
  };

  const handleToggle = (option: T) => {
    if (selected.includes(option)) {
      onChange(selected.filter(s => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const displayText = selected.length === 0
    ? label
    : selected.length <= 2
      ? `${selected.length} נבחרו: ${selected.join(', ')}`
      : `${selected.length} נבחרו`;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'justify-between min-w-[160px] text-right',
            selected.length > 0 && 'border-primary bg-primary/5'
          )}
        >
          <span className="truncate">{displayText}</span>
          <ChevronDown className="h-4 w-4 mr-2 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <div className="p-2 border-b">
          <div
            className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent rounded-md text-primary font-medium"
            onClick={handleSelectAll}
          >
            <Checkbox
              checked={isAllSelected}
              ref={(el) => {
                if (el) {
                  (el as HTMLButtonElement & { indeterminate?: boolean }).indeterminate = isPartiallySelected;
                }
              }}
            />
            <span>בחר הכל</span>
          </div>
        </div>
        <div className="max-h-60 overflow-y-auto p-2">
          {options.map((option) => (
            <div
              key={option}
              className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent rounded-md"
              onClick={() => handleToggle(option)}
            >
              <Checkbox checked={selected.includes(option)} />
              <span className="text-sm">{option}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const FilterPanel = ({
  filters,
  setFilters,
  filterOptions,
  selectedCount,
  onBulkEdit,
  onBulkDelete,
  onPrint,
  onClearFilters,
}: FilterPanelProps) => {
  const [isOpen, setIsOpen] = useState(true);

  const updateFilter = <K extends FilterKey>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const hasActiveFilters = Object.values(filters).some(arr => arr.length > 0);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="bg-card rounded-lg border shadow-sm">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              <span className="font-medium">🔍 פילטרים ופעולות</span>
              {hasActiveFilters && (
                <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                  פעיל
                </span>
              )}
            </div>
            {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="p-4 pt-0 space-y-4">
            {/* Filters Row */}
            <div className="flex flex-wrap gap-3">
              <MultiSelectFilter
                label="📅 תאריך קליטה"
                options={filterOptions.intakeMonths}
                selected={filters.intakeMonths}
                onChange={(val) => updateFilter('intakeMonths', val)}
              />
              <MultiSelectFilter
                label="📅 תאריך מסמך"
                options={filterOptions.documentMonths}
                selected={filters.documentMonths}
                onChange={(val) => updateFilter('documentMonths', val)}
              />
              <MultiSelectFilter
                label="🟡 סטטוס"
                options={filterOptions.statuses}
                selected={filters.statuses}
                onChange={(val) => updateFilter('statuses', val)}
              />
              <MultiSelectFilter
                label="🏢 ספקים"
                options={filterOptions.suppliers}
                selected={filters.suppliers}
                onChange={(val) => updateFilter('suppliers', val)}
              />
              <MultiSelectFilter
                label="📂 קטגוריות"
                options={filterOptions.categories}
                selected={filters.categories}
                onChange={(val) => updateFilter('categories', val)}
              />
              <MultiSelectFilter
                label="🏷️ סוג עוסק"
                options={filterOptions.businessTypes}
                selected={filters.businessTypes}
                onChange={(val) => updateFilter('businessTypes', val)}
              />
            </div>

            {/* Actions Row */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
              {selectedCount > 0 && (
                <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  {selectedCount} נבחרו
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={onBulkEdit}
                disabled={selectedCount === 0}
              >
                <Edit className="h-4 w-4 ml-1" />
                עריכה מרובה
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onBulkDelete}
                disabled={selectedCount === 0}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 ml-1" />
                מחק נבחרים
              </Button>
              <Button variant="outline" size="sm" onClick={onPrint}>
                <Printer className="h-4 w-4 ml-1" />
                הדפסה
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                disabled={!hasActiveFilters}
              >
                <RotateCcw className="h-4 w-4 ml-1" />
                נקה בחירה
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default FilterPanel;
