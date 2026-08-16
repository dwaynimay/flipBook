import { useCallback, useEffect, useState } from 'react';
import { isBookManifest, type BookManifest } from '@flip/manifest';
import { Flipbook } from './flipbook/Flipbook';
import { PageFlipProto } from './flipbook/PageFlipProto';

const BOOKS_ROOT = `${import.meta.env.BASE_URL}books`;

interface BookIndexEntry {
  id: string;
  title: string;
  pageCount: number;
  cover: string;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; manifest: BookManifest; assetBase: string }
  | { status: 'picker'; books: BookIndexEntry[] }
  | { status: 'error'; message: string };

function readParams(): { bookId: string | null; page: number; proto: boolean } {
  const params = new URLSearchParams(window.location.search);
  const page = Number(params.get('page'));
  return {
    bookId: params.get('book'),
    page: Number.isFinite(page) && page > 0 ? page - 1 : 0,
    // ?proto=pageflip — bandingkan engine react-pageflip tanpa mengubah jalur normal.
    proto: params.get('proto') === 'pageflip',
  };
}

export function App(): React.ReactElement {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [initialPage] = useState(() => readParams().page);
  const [useProto] = useState(() => readParams().proto);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      const { bookId } = readParams();

      // Tanpa ?book=, tampilkan daftar flipbook yang sudah dikonversi.
      if (!bookId) {
        try {
          const res = await fetch(`${BOOKS_ROOT}/index.json`);
          if (!res.ok) throw new Error('index tidak ditemukan');
          const books = (await res.json()) as BookIndexEntry[];
          if (!cancelled) setState({ status: 'picker', books });
        } catch {
          if (!cancelled) {
            setState({
              status: 'error',
              message:
                'Belum ada flipbook. Jalankan:  pnpm convert <file.pdf>  lalu muat ulang halaman ini.',
            });
          }
        }
        return;
      }

      try {
        const assetBase = `${BOOKS_ROOT}/${bookId}`;
        const res = await fetch(`${assetBase}/manifest.json`);
        if (!res.ok) throw new Error(`manifest tidak ditemukan (${res.status})`);
        const data: unknown = await res.json();
        if (!isBookManifest(data)) throw new Error('format manifest tidak dikenali');
        if (!cancelled) setState({ status: 'ready', manifest: data, assetBase });
      } catch (err) {
        if (!cancelled) setState({ status: 'error', message: (err as Error).message });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Sinkronkan halaman aktif ke URL tanpa menumpuk riwayat browser.
  const handlePageChange = useCallback((pageIndex: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set('page', String(pageIndex + 1));
    window.history.replaceState(null, '', `?${params.toString()}`);
  }, []);

  if (state.status === 'loading') {
    return (
      <div className="shell shell--center">
        <div className="spinner" aria-label="Memuat" />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="shell shell--center">
        <p className="notice">{state.message}</p>
      </div>
    );
  }

  if (state.status === 'picker') {
    return (
      <div className="shell shell--center">
        <div className="picker">
          <h1 className="picker__title">Flipbook</h1>
          {state.books.length === 0 ? (
            <p className="notice">Belum ada flipbook. Jalankan: pnpm convert &lt;file.pdf&gt;</p>
          ) : (
            <ul className="picker__list">
              {state.books.map((book) => (
                <li key={book.id}>
                  <a className="picker__card" href={`?book=${encodeURIComponent(book.id)}`}>
                    <img src={`${BOOKS_ROOT}/${book.id}/${book.cover}`} alt="" />
                    <span className="picker__name">{book.title}</span>
                    <span className="picker__meta">{book.pageCount} halaman</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  if (useProto) {
    return <PageFlipProto manifest={state.manifest} assetBase={state.assetBase} />;
  }

  return (
    <Flipbook
      manifest={state.manifest}
      assetBase={state.assetBase}
      initialPage={initialPage}
      onPageChange={handlePageChange}
    />
  );
}
