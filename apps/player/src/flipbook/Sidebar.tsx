import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BookManifest, OutlineNode, SearchIndex } from '@flip/manifest';

export type SidebarTab = 'thumbs' | 'toc' | 'search';

interface Props {
  manifest: BookManifest;
  assetBase: string;
  tab: SidebarTab;
  currentPage: number;
  onGoToPage(pageIndex: number): void;
  onClose(): void;
}

export function Sidebar({
  manifest,
  assetBase,
  tab,
  currentPage,
  onGoToPage,
  onClose,
}: Props): React.ReactElement {
  return (
    <aside className="sidebar" aria-label="Panel navigasi">
      <div className="sidebar__head">
        <span className="sidebar__title">
          {tab === 'thumbs' ? 'Halaman' : tab === 'toc' ? 'Daftar isi' : 'Cari'}
        </span>
        <button type="button" onClick={onClose} aria-label="Tutup panel">
          ×
        </button>
      </div>

      <div className="sidebar__body">
        {tab === 'thumbs' && (
          <Thumbnails
            manifest={manifest}
            assetBase={assetBase}
            currentPage={currentPage}
            onGoToPage={onGoToPage}
          />
        )}
        {tab === 'toc' && <Outline nodes={manifest.outline} onGoToPage={onGoToPage} />}
        {tab === 'search' && (
          <Search manifest={manifest} assetBase={assetBase} onGoToPage={onGoToPage} />
        )}
      </div>
    </aside>
  );
}

/* ---------------- thumbnail ---------------- */

function Thumbnails({
  manifest,
  assetBase,
  currentPage,
  onGoToPage,
}: Pick<Props, 'manifest' | 'assetBase' | 'currentPage' | 'onGoToPage'>): React.ReactElement {
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [currentPage]);

  return (
    <ul className="thumbs">
      {manifest.pages.map((page) => {
        const active = page.index === currentPage;
        return (
          <li key={page.index}>
            <button
              type="button"
              ref={active ? activeRef : null}
              className={`thumb${active ? ' thumb--active' : ''}`}
              onClick={() => onGoToPage(page.index)}
              aria-current={active ? 'page' : undefined}
            >
              <img
                src={`${assetBase}/${page.assets.thumb}`}
                alt=""
                loading="lazy"
                style={{ aspectRatio: `${page.width} / ${page.height}` }}
              />
              <span>{page.index + 1}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------------- daftar isi ---------------- */

function Outline({
  nodes,
  onGoToPage,
  depth = 0,
}: {
  nodes: OutlineNode[];
  onGoToPage(pageIndex: number): void;
  depth?: number;
}): React.ReactElement {
  if (nodes.length === 0 && depth === 0) {
    return <p className="sidebar__empty">Dokumen ini tidak punya daftar isi.</p>;
  }

  return (
    <ul className="outline">
      {nodes.map((node, i) => (
        <li key={`${depth}-${i}`}>
          <button
            type="button"
            className="outline__item"
            style={{ paddingLeft: 12 + depth * 14 }}
            onClick={() => onGoToPage(node.page)}
          >
            <span className="outline__label">{node.title}</span>
            <span className="outline__page">{node.page + 1}</span>
          </button>
          {node.children.length > 0 && (
            <Outline nodes={node.children} onGoToPage={onGoToPage} depth={depth + 1} />
          )}
        </li>
      ))}
    </ul>
  );
}

/* ---------------- pencarian ---------------- */

interface Hit {
  page: number;
  snippet: string;
  matchStart: number;
  matchLength: number;
}

const SNIPPET_RADIUS = 60;

function Search({
  manifest,
  assetBase,
  onGoToPage,
}: Pick<Props, 'manifest' | 'assetBase' | 'onGoToPage'>): React.ReactElement {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle');

  // Indeks dimuat malas — hanya saat panel pencarian benar-benar dibuka.
  useEffect(() => {
    if (!manifest.searchIndex) {
      setStatus('unavailable');
      return;
    }
    let cancelled = false;
    setStatus('loading');
    fetch(`${assetBase}/${manifest.searchIndex}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: SearchIndex) => {
        if (!cancelled) {
          setIndex(data);
          setStatus('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('unavailable');
      });
    return () => {
      cancelled = true;
    };
  }, [manifest.searchIndex, assetBase]);

  const hits = useMemo((): Hit[] => {
    const needle = query.trim().toLowerCase();
    if (!index || needle.length < 2) return [];

    const results: Hit[] = [];
    for (const page of index.pages) {
      const haystack = page.text.toLowerCase();
      let from = 0;
      // Beberapa kecocokan per halaman, tapi dibatasi supaya daftar tetap terbaca.
      let perPage = 0;
      while (perPage < 3) {
        const at = haystack.indexOf(needle, from);
        if (at === -1) break;
        const start = Math.max(0, at - SNIPPET_RADIUS);
        const end = Math.min(page.text.length, at + needle.length + SNIPPET_RADIUS);
        results.push({
          page: page.index,
          snippet:
            (start > 0 ? '…' : '') +
            page.text.slice(start, end) +
            (end < page.text.length ? '…' : ''),
          matchStart: at - start + (start > 0 ? 1 : 0),
          matchLength: needle.length,
        });
        from = at + needle.length;
        perPage += 1;
      }
      if (results.length >= 80) break;
    }
    return results;
  }, [index, query]);

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  return (
    <div className="search">
      <input
        className="search__input"
        type="search"
        value={query}
        onChange={onChange}
        placeholder="Cari di dalam flipbook…"
        aria-label="Cari teks di dalam flipbook"
        autoFocus
      />

      {status === 'loading' && <p className="sidebar__empty">Memuat indeks…</p>}
      {status === 'unavailable' && (
        <p className="sidebar__empty">Dokumen ini tidak punya teks yang bisa dicari.</p>
      )}
      {status === 'ready' && query.trim().length >= 2 && (
        <p className="search__count" aria-live="polite">
          {hits.length === 0 ? 'Tidak ada hasil' : `${hits.length} hasil`}
        </p>
      )}

      <ul className="search__results">
        {hits.map((hit, i) => (
          <li key={`${hit.page}-${i}`}>
            <button type="button" className="search__hit" onClick={() => onGoToPage(hit.page)}>
              <span className="search__hitPage">Halaman {hit.page + 1}</span>
              <span className="search__snippet">
                {hit.snippet.slice(0, hit.matchStart)}
                <mark>{hit.snippet.slice(hit.matchStart, hit.matchStart + hit.matchLength)}</mark>
                {hit.snippet.slice(hit.matchStart + hit.matchLength)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
