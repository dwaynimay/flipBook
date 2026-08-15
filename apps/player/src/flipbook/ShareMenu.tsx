import { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
  title: string;
  onClose(): void;
}

/** Kode embed sengaja responsif — rasio dijaga tanpa script apa pun. */
function embedCode(url: string, title: string): string {
  return `<div style="position:relative;padding-top:70%">
  <iframe src="${url}" title="${title.replace(/"/g, '&quot;')}"
    style="position:absolute;inset:0;width:100%;height:100%;border:0"
    allowfullscreen loading="lazy"></iframe>
</div>`;
}

export function ShareMenu({ title, onClose }: Props): React.ReactElement {
  const [copied, setCopied] = useState<'link' | 'embed' | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const shareUrl = window.location.href;
  const embedUrl = (() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('page');
    return url.toString();
  })();

  // Tutup saat klik di luar atau tekan Escape.
  useEffect(() => {
    const onDown = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const copy = useCallback(async (text: string, kind: 'link' | 'embed') => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API butuh konteks aman & izin. Fallback ini masih bekerja
      // di http:// lokal dan di iframe tanpa izin clipboard.
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setCopied(kind);
    setTimeout(() => setCopied(null), 1600);
  }, []);

  return (
    <div className="share" ref={ref} role="dialog" aria-label="Bagikan flipbook">
      <label className="share__label" htmlFor="share-link">
        Tautan
      </label>
      <div className="share__row">
        <input id="share-link" readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
        <button type="button" onClick={() => void copy(shareUrl, 'link')}>
          {copied === 'link' ? 'Tersalin' : 'Salin'}
        </button>
      </div>

      <label className="share__label" htmlFor="share-embed">
        Sematkan di website
      </label>
      <div className="share__row">
        <textarea
          id="share-embed"
          readOnly
          rows={4}
          value={embedCode(embedUrl, title)}
          onFocus={(e) => e.target.select()}
        />
      </div>
      <button
        type="button"
        className="share__wide"
        onClick={() => void copy(embedCode(embedUrl, title), 'embed')}
      >
        {copied === 'embed' ? 'Kode tersalin' : 'Salin kode embed'}
      </button>
    </div>
  );
}
