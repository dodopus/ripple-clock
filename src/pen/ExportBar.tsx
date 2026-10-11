import { useState } from 'react';
import type { ClockConfig } from '../clock.config';
import { buildPen, copyConfig, downloadStandaloneHtml, openInCodePen } from './export';

type Status = { tone: 'ok' | 'error'; text: string } | null;

/** Export row in the settings drawer: hand the current look to CodePen, the clipboard or a file. */
export function ExportBar({ config }: { config: ClockConfig }) {
  const [status, setStatus] = useState<Status>(null);

  const run = async (action: () => Promise<unknown> | void, done: string) => {
    try {
      await action();
      setStatus({ tone: 'ok', text: done });
    } catch (err) {
      setStatus({ tone: 'error', text: err instanceof Error ? err.message : String(err) });
    }
    setTimeout(() => setStatus(null), 2500);
  };

  const btn =
    'px-2 py-1 rounded text-[10px] font-mono transition-colors cursor-pointer border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 hover:text-zinc-900';

  return (
    <div className="px-4 py-2 border-b border-zinc-100 bg-zinc-50/40 flex items-center gap-1.5 flex-wrap">
      <button
        className="px-2 py-1 rounded text-[10px] font-mono font-semibold transition-colors cursor-pointer bg-zinc-900 text-white hover:bg-zinc-700"
        title="Open a new pen with this exact clock (no settings panel)"
        onClick={() => run(async () => openInCodePen(await buildPen(config)), 'Opened in CodePen')}
      >
        ↗ Open in CodePen
      </button>
      <button
        className={btn}
        title="Copy CLOCK_CONFIG JSON: paste over the object in a pen, or over src/clock.config.json to make it the default"
        onClick={() => run(() => copyConfig(config), 'Config copied')}
      >
        Copy config
      </button>
      <button
        className={btn}
        title="Download the clock as one self-contained HTML file"
        onClick={() => run(async () => downloadStandaloneHtml(await buildPen(config)), 'Downloaded')}
      >
        ⤓ .html
      </button>
      {status && (
        <span className={`text-[10px] font-mono ${status.tone === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>
          {status.text}
        </span>
      )}
    </div>
  );
}
