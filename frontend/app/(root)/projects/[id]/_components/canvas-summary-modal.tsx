'use client';

import { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, ClipboardCopy, Download, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { CanvasSummarySchema } from '@/schema/canvas.schema';

interface SummaryItem { text: string; nodeId: string }

interface SectionProps {
  title: string;
  items: SummaryItem[];
  emptyLabel: string;
  accentClass: string;
  dotClass: string;
}

function Section({ title, items, emptyLabel, accentClass, dotClass }: SectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div>
      <button
        className="flex w-full items-center justify-between py-1"
        onClick={() => setCollapsed((v) => !v)}
      >
        <span className={`text-xs font-semibold uppercase tracking-wide ${accentClass}`}>{title}</span>
        {collapsed
          ? <ChevronDown className="size-3.5 text-gray-400" />
          : <ChevronUp className="size-3.5 text-gray-400" />}
      </button>
      {!collapsed && (
        items.length === 0
          ? <p className="mt-1 text-sm text-gray-400 italic">{emptyLabel}</p>
          : (
            <ul className="mt-1 space-y-1.5">
              {items.map((item) => (
                <li key={item.nodeId} className="flex items-start gap-2">
                  <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${dotClass}`} />
                  <span className="text-sm text-gray-700">{item.text}</span>
                </li>
              ))}
            </ul>
          )
      )}
    </div>
  );
}

function buildPlainText(summary: CanvasSummarySchema): string {
  const lines: string[] = ['# Canvas Summary', '', summary.overview, ''];

  const sections: [string, SummaryItem[]][] = [
    ['Decisions', summary.decisions],
    ['Action Items', summary.actionItems],
    ['Open Questions', summary.openQuestions],
    ['References', summary.references],
  ];

  for (const [title, items] of sections) {
    lines.push(`## ${title}`);
    if (items.length === 0) {
      lines.push('(none)');
    } else {
      for (const item of items) lines.push(`- ${item.text}`);
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}

interface CanvasSummaryModalProps {
  open: boolean;
  loading: boolean;
  summary: CanvasSummarySchema | null;
  generatedAt: string | null;
  onClose: () => void;
}

export function CanvasSummaryModal({ open, loading, summary, generatedAt, onClose }: CanvasSummaryModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!summary) return;
    await navigator.clipboard.writeText(buildPlainText(summary));
    setCopied(true);
    toast.success('Summary copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!summary) return;
    const blob = new Blob([buildPlainText(summary)], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `canvas-summary-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-brand-primary" />
            AI Canvas Summary
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 className="size-8 animate-spin text-brand-primary" />
              <p className="text-sm text-gray-500">Generating summary…</p>
            </div>
          )}

          {!loading && summary && (
            <div className="space-y-4">
              {/* Overview */}
              <div className="rounded-lg bg-pink-50 border border-pink-100 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary mb-1">Overview</p>
                <p className="text-sm text-gray-700 leading-relaxed">{summary.overview}</p>
              </div>

              <Separator />

              <Section
                title="Decisions"
                items={summary.decisions}
                emptyLabel="No decisions recorded."
                accentClass="text-purple-600"
                dotClass="bg-purple-400"
              />
              <Separator />
              <Section
                title="Action Items"
                items={summary.actionItems}
                emptyLabel="No action items recorded."
                accentClass="text-emerald-600"
                dotClass="bg-emerald-400"
              />
              <Separator />
              <Section
                title="Open Questions"
                items={summary.openQuestions}
                emptyLabel="No open questions recorded."
                accentClass="text-amber-600"
                dotClass="bg-amber-400"
              />
              <Separator />
              <Section
                title="References"
                items={summary.references}
                emptyLabel="No references recorded."
                accentClass="text-sky-600"
                dotClass="bg-sky-400"
              />

              {generatedAt && (
                <p className="text-center text-[11px] text-gray-400 pt-1">
                  Generated {new Date(generatedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>

        {summary && !loading && (
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
              {copied ? <CheckCircle2 className="size-3.5 text-emerald-500" /> : <ClipboardCopy className="size-3.5" />}
              Copy
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
              <Download className="size-3.5" />
              Download
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
