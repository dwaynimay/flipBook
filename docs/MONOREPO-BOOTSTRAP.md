# Monorepo Bootstrap Guide

## Status

Approved. Fondasi root dan shared config pada FND-001 sampai FND-005 selesai,
sedangkan implementasi workflow FND-006 dan seluruh gate lokal ekuivalen
selesai pada 30 Juli 2026. Bukti hosted clean-checkout CI masih menunggu initial
commit/push. Hasil command aktual dicatat di `FOUNDATION-VERIFICATION.md`.

## 1. Pilihan

Gunakan:

- pnpm workspaces untuk dependency dan package linking;
- Turborepo untuk task graph dan cache;
- satu repository;
- satu `pnpm-lock.yaml`;
- satu package per app/library;
- TypeScript config berlapis;
- NestJS sebagai `apps/api`, bukan nested Nest monorepo.

## 2. Prasyarat

- Git
- Node.js LTS yang kompatibel dengan seluruh toolchain
- Corepack
- Docker Desktop untuk fase infrastructure

Verifikasi:

```powershell
node --version
corepack --version
git --version
docker --version
```

## 3. Aktifkan pnpm

Versi registry yang dikunci saat eksekusi adalah pnpm `11.18.0`.

```powershell
corepack enable
corepack prepare pnpm@11.18.0 --activate
pnpm --version
```

Setelah repository memiliki root `package.json`, `packageManager` akan menjaga versi package manager tetap konsisten.

## 4. Buat Folder Fondasi

Dari root repository:

```powershell
$folders = @(
  'apps/web',
  'apps/admin',
  'apps/api',
  'packages/api-contracts',
  'packages/content-schema',
  'packages/block-renderer',
  'packages/block-editor',
  'packages/flipbook-engine',
  'packages/quiz-engine',
  'packages/ui',
  'packages/database',
  'packages/observability',
  'packages/config-eslint',
  'packages/config-typescript',
  'tooling/scripts',
  '.github/workflows'
)

foreach ($folder in $folders) {
  New-Item -ItemType Directory -Force -Path $folder | Out-Null
}
```

Jangan menambahkan source code aplikasi pada langkah ini.

## 5. Root `package.json`

Baseline yang telah diimplementasikan:

```json
{
  "name": "interactive-digital-booklet",
  "version": "0.0.0",
  "private": true,
  "packageManager": "pnpm@11.18.0",
  "engines": {
    "node": ">=24.0.0",
    "pnpm": "11.18.0"
  },
  "scripts": {
    "build": "turbo run build",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "license:check": "node tooling/scripts/check-licenses.mjs",
    "lint": "turbo run lint && eslint eslint.config.mjs prettier.config.mjs --max-warnings=0",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck"
  },
  "devDependencies": {
    "@booklet/eslint-config": "workspace:*",
    "@types/node": "24.13.3",
    "eslint": "10.8.0",
    "prettier": "3.9.6",
    "turbo": "2.10.7",
    "typescript": "6.0.3"
  }
}
```

Catatan:

- TypeScript 7.0.2 tidak dipakai karena peer contract `typescript-eslint`
  8.65.0 hanya menerima TypeScript `<6.1.0`;
- seluruh dependency foundation memakai versi exact dan lockfile, bukan caret
  range atau tag `latest`;
- root tidak mengekspos `dev`, `test:e2e`, atau `clean` sebelum ada app/package
  yang benar-benar memiliki task tersebut;
- jika `clean` kelak ditambahkan, setiap package hanya boleh menghapus output
  miliknya sendiri.

## 6. `pnpm-workspace.yaml`

```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "tooling/*"
```

Semua internal dependency menggunakan bentuk:

```json
{
  "dependencies": {
    "@booklet/content-schema": "workspace:*"
  }
}
```

## 7. `turbo.json`

```json
{
  "$schema": "https://turborepo.com/schema.json",
  "ui": "tui",
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "lint": {
      "dependsOn": ["^lint"],
      "outputs": []
    },
    "typecheck": {
      "dependsOn": ["^typecheck"],
      "outputs": []
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "test:e2e": {
      "cache": false
    },
    "clean": {
      "cache": false
    }
  }
}
```

Jangan memasukkan `.env` sebagai cached input/output. Environment variable production perlu dideklarasikan secara eksplisit ketika pipeline deployment dibuat.

Foundation packages hanya memvalidasi konfigurasi dan tidak menghasilkan build
artifact, sehingga baseline memakai `outputs: []`. App/package yang kemudian
menghasilkan `dist`, `build`, atau `.vite` wajib menambahkan output cache yang
akurat pada konfigurasi Turbo package tersebut; jangan mengklaim output yang
belum benar-benar dibuat.

Task Turbo `dev`, `test:e2e`, dan `clean` pada baseline hanyalah nama pipeline
yang dicadangkan untuk owner mendatang. Ketiganya sengaja tidak diekspos sebagai
root script dan bukan bukti task fungsional.

## 8. `tsconfig.base.json`

Base config hanya memuat aturan yang aman untuk browser dan Node. Module system, DOM library, JSX, dan decorator dikonfigurasi oleh config app/package masing-masing.

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2023",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "useDefineForClassFields": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

Alasan `module`, `moduleResolution`, `lib`, dan `jsx` tidak diletakkan di base:

- Vite frontend membutuhkan konfigurasi bundler dan DOM;
- NestJS membutuhkan konfigurasi Node serta decorator;
- package schema murni tidak membutuhkan DOM atau decorator;
- satu config yang memaksakan semuanya akan menciptakan kebocoran environment.

## 9. Config Turunan yang Diimplementasikan

### `packages/config-typescript/browser.json`

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "isolatedModules": true,
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler"
  }
}
```

### `packages/config-typescript/react-library.json`

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./browser.json",
  "compilerOptions": {
    "emitDeclarationOnly": false,
    "jsx": "react-jsx"
  }
}
```

### `packages/config-typescript/node.json`

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2023"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "types": ["node"]
  }
}
```

### `packages/config-typescript/framework-free.json`

Konfigurasi domain/schema murni menggunakan `lib: ["ES2023"]`, `types: []`, dan
tidak memuat DOM. Contract fixture harus membuktikan browser globals seperti
`document` ditolak compiler. `packages/content-schema` wajib memakai baseline
ini ketika package tersebut dibuat.

### `apps/api/tsconfig.json`

Konfigurasi final sebaiknya dibuat oleh Nest CLI versi yang dipilih, lalu disederhanakan agar extend config bersama. Jangan menyalin config Nest lama karena kebutuhan decorator/compiler dapat berubah.

## 10. Naming Package

Gunakan scope tunggal:

```text
@booklet/web
@booklet/admin
@booklet/api
@booklet/content-schema
@booklet/block-renderer
@booklet/block-editor
@booklet/flipbook-engine
@booklet/quiz-engine
@booklet/ui
@booklet/database
```

Contoh package library:

```json
{
  "name": "@booklet/content-schema",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "lint": "eslint .",
    "test": "vitest run",
    "clean": "rimraf dist coverage"
  }
}
```

Ini hanya template kontrak package, bukan instruksi untuk membuat seluruh package sekaligus.

## 11. Urutan Scaffolding yang Aman

### Step A — Root Foundation

1. Jalankan `git init` jika root belum menjadi Git repository.
2. Buat root `package.json`.
3. Buat `pnpm-workspace.yaml`.
4. Buat `turbo.json`.
5. Buat `tsconfig.base.json`.
6. Tambah `.gitignore`, `.gitattributes`, `.editorconfig`, dan Prettier config.
7. Jalankan `corepack pnpm install`.
8. Commit sebagai `chore(repo): initialize workspace foundation`.

### Step B — Shared Config

1. Scaffold `config-typescript`.
2. Scaffold `config-eslint`.
3. Tambah quality gate scripts.
4. Pastikan setiap shared-config package menjalankan typecheck miliknya.
5. Commit terpisah.

### Step C — Contract First

1. Scaffold `content-schema`.
2. Definisikan `PageDocument` v1.
3. Tambahkan fixtures dan contract tests.
4. Scaffold `block-renderer` setelah schema stabil.
5. Scaffold `flipbook-engine` setelah renderer memiliki stable page root.

### Step D — First Vertical Slice

1. Scaffold `apps/api`.
2. Scaffold `packages/database`.
3. Scaffold `apps/admin`.
4. Scaffold `apps/web`.
5. Implementasikan satu slice: heading + paragraph + image → publish → reader.

Jangan memulai reminder, analytics, quiz, dan video secara paralel sebelum vertical slice publish-to-read lulus.

## 12. Perintah Inisialisasi Root

Setelah file root disetujui:

```powershell
corepack pnpm install
corepack pnpm exec turbo --version
corepack pnpm exec tsc --version
corepack pnpm run format:check
```

Task root `dev`, `test:e2e`, dan `clean` tidak boleh ditambahkan hanya agar
perintah tampak tersedia. Tambahkan setelah ada owner nyata dan contract test
yang relevan.

## 13. Validasi Struktur

```powershell
corepack pnpm list --depth 0
corepack pnpm exec turbo run build --dry=json
git status --short
```

Periksa:

- hanya satu lockfile di root;
- tidak ada nested `.git`;
- tidak ada nested lockfile;
- tidak ada `node_modules` yang di-commit;
- tidak ada `.env` yang di-commit;
- internal dependency memakai `workspace:*`.

## 14. Catatan Tentang npm Workspaces

npm workspaces tetap memungkinkan, tetapi keputusan proyek ini adalah pnpm karena:

- `pnpm-workspace.yaml` membuat cakupan package eksplisit;
- protokol `workspace:` mencegah dependency internal tanpa sengaja diambil dari registry;
- disk usage lebih efisien untuk monorepo;
- Prisma menyediakan panduan resmi pnpm workspace.

Jangan mencampur npm dan pnpm setelah lockfile pertama dibuat.

## 15. Output Phase 0

Phase 0 dianggap selesai jika repository memiliki:

- struktur folder yang disetujui;
- root workspace config;
- shared TypeScript/ESLint config;
- CI install/lint/typecheck/test foundation yang benar-benar mengeksekusi owner;
- dokumentasi PRD dan architecture;
- ADR awal;
- tidak ada fitur aplikasi yang diimplementasikan.
