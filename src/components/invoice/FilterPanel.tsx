import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { FilterState, InvoiceStatus, BusinessType, DuplicatesFilterMode } from '@/types/invoice';
import { ChevronDown, ChevronUp, Filter, Edit, Trash2, Printer, RotateCcw, Copy, Search, Plus, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
  duplicatesCount: number;
  duplicatesMode: DuplicatesFilterMode;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onBulkEdit: () => void;
  onBulkDelete: () => void;
  onPrint: () => void;
  onClearFilters: () => void;
  onToggleDuplicates: () => void;
  onAddInvoice: () => void;
  onImportExcel: () => void;
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
      ? `${selected.length} נבחרו`
      : `${selected.length} נבחרו`;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'justify-between min-w-[140px]',
            selected.length > 0 && 'border-primary bg-primary/5'
          )}
        >
          <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
          <span className="truncate">{displayText}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="end">
        <div className="p-2 border-b">
          <div
            className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent rounded-md text-primary font-medium flex-row-reverse"
            onClick={handleSelectAll}
          >
            <span>בחר הכל</span>
            <Checkbox
              checked={isAllSelected}
              ref={(el) => {
                if (el) {
                  (el as HTMLButtonElement & { indeterminate?: boolean }).indeterminate = isPartiallySelected;
                }
              }}
            />
          </div>
        </div>
        <div className="max-h-60 overflow-y-auto p-2">
          {options.map((option) => (
            <div
              key={option}
              className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent rounded-md flex-row-reverse"
              onClick={() => handleToggle(option)}
            >
              <span className="text-sm">{option}</span>
              <Checkbox checked={selected.includes(option)} />
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
  duplicatesCount,
  duplicatesMode,
  searchQuery,
  onSearchChange,
  onBulkEdit,
  onBulkDelete,
  onPrint,
  onClearFilters,
  onToggleDuplicates,
  onAddInvoice,
  onImportExcel,
}: FilterPanelProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [showAmountFilter, setShowAmountFilter] = useState(false);

  const updateFilter = <K extends FilterKey>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'amountMin' || key === 'amountMax') return value !== null;
    return Array.isArray(value) && value.length > 0;
  });

  const getDuplicatesButtonVariant = () => {
    if (duplicatesMode === 'duplicates_only') return 'default';
    if (duplicatesMode === 'no_duplicates') return 'secondary';
    return 'outline';
  };

  const getDuplicatesButtonText = () => {
    if (duplicatesMode === 'duplicates_only') return 'מציג כפילויות';
    if (duplicatesMode === 'no_duplicates') return 'מסתיר כפילויות';
    return 'סינון כפילויות';
  };

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
            {/* Add Buttons Row */}
            <div className="flex flex-wrap gap-2">
              <Button onClick={onAddInvoice} size="sm">
                <Plus className="h-4 w-4 ml-1" />
                הוסף חשבונית
              </Button>
              <Button variant="outline" onClick={onImportExcel} size="sm">
                <Upload className="h-4 w-4 ml-1" />
                ייבוא Excel
              </Button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="חיפוש חופשי..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pr-10"
              />
            </div>

            {/* Status Quick Filters */}
            <div className="flex flex-wrap gap-2 justify-end">
              {filterOptions.statuses.map((status) => (
                <Badge
                  key={status}
                  variant={filters.statuses.includes(status) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    if (filters.statuses.includes(status)) {
                      updateFilter('statuses', filters.statuses.filter(s => s !== status));
                    } else {
                      updateFilter('statuses', [...filters.statuses, status]);
                    }
                  }}
                >
                  {status}
                </Badge>
              ))}
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap gap-3 justify-end">
              <MultiSelectFilter
                label="חודש קליטה 🔥"
                options={filterOptions.intakeMonths}
                selected={filters.intakeMonths}
                onChange={(val) => updateFilter('intakeMonths', val)}
              />
              <MultiSelectFilter
                label="חודש מסמך 📅"
                options={filterOptions.documentMonths}
                selected={filters.documentMonths}
                onChange={(val) => updateFilter('documentMonths', val)}
              />
              <MultiSelectFilter
                label="ספקים"
                options={filterOptions.suppliers}
                selected={filters.suppliers}
                onChange={(val) => updateFilter('suppliers', val)}
              />
              <MultiSelectFilter
                label="קטגוריות"
                options={filterOptions.categories}
                selected={filters.categories}
                onChange={(val) => updateFilter('categories', val)}
              />
              <MultiSelectFilter
                label="סוג עסק"
                options={filterOptions.businessTypes}
                selected={filters.businessTypes}
                onChange={(val) => updateFilter('businessTypes', val)}
              />
              
              {/* Amount Filter */}
              <Popover open={showAmountFilter} onOpenChange={setShowAmountFilter}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'min-w-[140px]',
                      (filters.amountMin !== null || filters.amountMax !== null) && 'border-primary bg-primary/5'
                    )}
                  >
                    <ChevronDown className="h-4 w-4 ml-2" />
                    <span>סכום סה"כ</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-4" align="end">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">סכום מינימום</label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={filters.amountMin ?? ''}
                        onChange={(e) => updateFilter('amountMin', e.target.value ? Number(e.target.value) : null)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">סכום מקסימום</label>
                      <Input
                        type="number"
                        placeholder="ללא הגבלה"
                        value={filters.amountMax ?? ''}
                        onChange={(e) => updateFilter('amountMax', e.target.value ? Number(e.target.value) : null)}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        updateFilter('amountMin', null);
                        updateFilter('amountMax', null);
                      }}
                    >
                      נקה
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Actions Row */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                disabled={!hasActiveFilters && searchQuery === '' && duplicatesMode === 'all'}
              >
                <RotateCcw className="h-4 w-4 ml-1" />
                נקה הכל
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onBulkDelete}
                disabled={selectedCount === 0}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 ml-1" />
                מחק ({selectedCount})
              </Button>
              <Button
                variant={getDuplicatesButtonVariant()}
                size="sm"
                onClick={onToggleDuplicates}
              >
                <Copy className="h-4 w-4 ml-1" />
                {getDuplicatesButtonText()}
                {duplicatesCount > 0 && duplicatesMode === 'all' && (
                  <Badge variant="secondary" className="mr-2">{duplicatesCount}</Badge>
                )}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={onPrint}
                disabled={selectedCount === 0}
              >
                <Printer className="h-4 w-4 ml-1" />
                הדפסה
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onBulkEdit}
                disabled={selectedCount !== 1}
              >
                <Edit className="h-4 w-4 ml-1" />
                עריכה
              </Button>
              {selectedCount > 0 && (
                <Badge variant="secondary" className="text-sm">
                  {selectedCount} נבחרו
                </Badge>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default FilterPanel;