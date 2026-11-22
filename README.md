# SeekYe

SeekYe is a Tauri 2 desktop app with a statically exported Next.js/React dashboard. It automates Yandex Images through a **separate native WebView window** and sends image metadata to the dashboard. No Next.js server is required in packaged builds. No Chrome/Lightpanda runtime is required for the default backend.

## How it works

1. User enters query in the React dashboard and invokes the native `search_images` command.
2. Rust opens `https://ya.ru/` in a separate macOS WKWebView window. A page-load hook injects `automation.js`, fills the visible search input, then follows the Images link if present (or opens the direct Yandex Images search URL).
3. On Yandex Images, injected JS reads image tile metadata (`data-bem`, `data-state`) with a DOM `img` fallback, and navigates to a private `seekye-results:` URL carrying serialized JSON.
4. Rust's navigation callback intercepts and blocks that URL and emits a `seekye:results` event **to the local dashboard**. The remote browser window has no Tauri command permissions.
5. The dashboard renders a thumbnail gallery and exports JSON. URLs are not rewritten or downloaded.

This is an **experimental DOM automation prototype**, not a stable Yandex Images API. Yandex may change its HTML, require verification, vary results by region or block traffic. The automated image results are not guaranteed. A user can complete an interactive verification in the visible browser window, then rerun the search. The app does not bypass anti-bot measures.

## Local development (Apple Silicon macOS)

Prerequisites: Xcode Command Line Tools (`xcode-select --install`), Node.js 22+, Rust (`rustup`) with `aarch64-apple-darwin` installed.

```sh
npm install
npm run desktop:dev
```

Build the installable ARM64 DMG:

```sh
npm run desktop:build
# src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/*.dmg
```

Dashboard-only preview: `npm run dev`. Image automation requires the Tauri runtime and won't work in a normal browser tab.

## CI/CD

- GitHub: `.github/workflows/build-macos.yml` runs on macOS 15, uploads ARM64 build artifacts on every push to `main`, on PRs, and on manual runs. `v*` tags also create a GitHub Release containing the DMG.
- GitLab: `.gitlab-ci.yml` builds using a **self-hosted Apple Silicon macOS runner** tagged `macos-arm64`. Standard GitLab shared Linux runners cannot produce native macOS builds.
- The `*.app` and `*.dmg` are **build artifacts**, not committed binaries.
- Builds are **unsigned and unnotarized**. For public distribution add Apple Developer ID signing and notarization; macOS Gatekeeper may block unsigned downloads.

## Repository bootstrap

The single-file script `bootstrap_seekye.py` generates this complete tree, and initializes `git` by default:

```sh
python3 bootstrap_seekye.py
cd SeekYe
npm install
npm run desktop:dev
```

The bootstrap refuses to overwrite an existing nonempty `SeekYe/` directory. Use `python3 bootstrap_seekye.py --dir /path/to/new-project` to choose a destination.

## Backends and extension

The initial implementation intentionally uses **WKWebView automation** rather than Lightpanda. This keeps the `.app` small and self-contained, and allows visual interaction with verification challenges. Lightpanda can be integrated as a second, headless CDP backend in a later iteration with a Rust-managed browser process or securely packaged sidecar. Lightpanda runs without a graphical renderer and therefore cannot replace the visible browser view 1:1.

Image URLs can be hotlinked only where the host permits. Some images will fail to display due to referer/CORS policy, expiry or connectivity. User should respect copyright and website terms. Only use search metadata within rights granted by sources.

## Security

The dashboard is local, browser automation is limited to `https` Yandex domains, queries are serialized as JSON before injection, and no generic arbitrary JavaScript evaluation command is exposed to the dashboard. The custom result navigation is intercepted and not loaded. To production-harden: use a dedicated non-navigation IPC channel with origin validation, explicitly restrict image resource CSP, add signed updates, and test against live Yandex DOM changes.
