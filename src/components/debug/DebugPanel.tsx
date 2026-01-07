import { useState } from 'react';
import { Bug, ChevronDown, ChevronUp, Database, Calculator, Code, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCurrency, formatCount } from '@/lib/formatters';

export interface DebugValue {
  label: string;
  value: number | string | boolean | null | undefined;
  indent?: number;
  isRaw?: boolean;  // Se true, mostra il valore raw senza formattazione valuta
}

interface DebugPanelProps {
  title: string;
  hookName: string;
  calculation: string;
  values: DebugValue[];
  dataSource?: string;
  className?: string;
}

export function DebugPanel({ 
  title, 
  hookName, 
  calculation, 
  values, 
  dataSource = 'useBudgetStore()',
  className 
}: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  /**
   * Formatta il valore per la visualizzazione.
   * IMPORTANTE: usa isRaw per distinguere tra:
   * - isRaw=false (default): importi → formatCurrency
   * - isRaw=true: conteggi, ID, stringhe → raw
   */
  const formatValue = (val: DebugValue['value'], isRaw?: boolean): string => {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'boolean') return val ? 'Sì' : 'No';
    if (typeof val === 'string') return val;
    if (typeof val === 'number') {
      // Se isRaw, mostra come numero semplice (senza € o formattazione locale che potrebbe confondere)
      if (isRaw) {
        // Usa Math.round per interi, altrimenti toFixed(2)
        return Number.isInteger(val) ? String(val) : val.toFixed(2);
      }
      // Altrimenti formatta come valuta
      return formatCurrency(val);
    }
    return String(val);
  };

  const copyToClipboard = () => {
    const data = {
      title,
      hookName,
      dataSource,
      values: values.map(v => ({
        label: v.label,
        value: v.value,
        isRaw: v.isRaw,
      })),
    };
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn(
      "relative mt-2 rounded-lg border-2 border-dashed border-amber-400/50 bg-amber-50/50 dark:bg-amber-950/20",
      className
    )}>
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between h-8 px-3 text-xs font-mono text-amber-700 dark:text-amber-300 hover:bg-amber-100/50 dark:hover:bg-amber-900/30"
      >
        <span className="flex items-center gap-2">
          <Bug className="h-3 w-3" />
          DEBUG: {title}
        </span>
        {isOpen ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </Button>

      {/* Expanded Content */}
      {isOpen && (
        <div className="p-3 pt-0 font-mono text-[11px] text-amber-800 dark:text-amber-200 space-y-3">
          {/* Hook Name */}
          <div className="flex items-start gap-2 p-2 rounded bg-amber-100/50 dark:bg-amber-900/30">
            <Code className="h-3 w-3 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold">HOOK: </span>
              <span className="break-all">{hookName}</span>
            </div>
          </div>

          {/* Data Source */}
          <div className="flex items-start gap-2 p-2 rounded bg-amber-100/50 dark:bg-amber-900/30">
            <Database className="h-3 w-3 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold">DATA SOURCE: </span>
              <span>{dataSource}</span>
            </div>
          </div>

          {/* Calculation */}
          <div className="p-2 rounded bg-amber-100/50 dark:bg-amber-900/30">
            <div className="flex items-start gap-2">
              <Calculator className="h-3 w-3 mt-0.5 shrink-0" />
              <span className="font-semibold">CALCULATION:</span>
            </div>
            <pre className="mt-1 ml-5 whitespace-pre-wrap text-[10px] leading-relaxed opacity-80">
              {calculation}
            </pre>
          </div>

          {/* Values */}
          <div className="p-2 rounded bg-amber-100/50 dark:bg-amber-900/30">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">VALUES:</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyToClipboard}
                className="h-6 px-2 text-[10px] text-amber-600 hover:text-amber-800 hover:bg-amber-200/50"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Copiato!
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-1" />
                    Copia JSON
                  </>
                )}
              </Button>
            </div>
            <div className="space-y-1">
              {values.map((v, i) => {
                // Salta le righe separatore (label con --- e value vuoto)
                const isSeparator = v.label.startsWith('---') && v.value === '';
                
                if (isSeparator) {
                  return (
                    <div key={i} className="pt-2 mt-2 border-t border-amber-300/50 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                      {v.label.replace(/---/g, '').trim()}
                    </div>
                  );
                }
                
                return (
                  <div 
                    key={i} 
                    className={cn(
                      "flex justify-between gap-2",
                      v.indent === 1 && "ml-3",
                      v.indent === 2 && "ml-6",
                    )}
                  >
                    <span className={cn(
                      v.indent === 1 && "before:content-['•'] before:mr-1 before:text-amber-400",
                    )}>
                      {v.label}
                    </span>
                    <span className={cn(
                      "font-semibold tabular-nums shrink-0",
                      v.isRaw && "text-amber-600/70 dark:text-amber-400/70"
                    )}>
                      {formatValue(v.value, v.isRaw)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Removal Note */}
          <p className="text-[9px] opacity-50 text-center">
            🔧 Pannello temporaneo - rimuovere per release pubblica
          </p>
        </div>
      )}
    </div>
  );
}
