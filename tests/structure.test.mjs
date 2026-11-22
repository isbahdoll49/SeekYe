import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
test('static Next.js export',()=>{const cfg=readFileSync('next.config.mjs','utf8');assert.match(cfg,/output:\s*'export'/);});
test('Yandex automation and event wiring',()=>{const rust=readFileSync('src-tauri/src/lib.rs','utf8');const js=readFileSync('src-tauri/src/automation.js','utf8');assert.match(rust,/seekye:results/);assert.match(js,/seekye-results:\/\/done/);assert.match(js,/\/images\/search/);});
test('both CI providers',()=>{assert.ok(existsSync('.github/workflows/build-macos.yml'));assert.ok(existsSync('.gitlab-ci.yml'));});

test('tag-only public cross-platform release pipeline',()=>{const wf=readFileSync('.github/workflows/build-macos.yml','utf8');assert.match(wf,/tags:/);assert.doesNotMatch(wf,/branches:/);assert.match(wf,/windows-2022/);assert.match(wf,/--bundles nsis/);assert.match(wf,/publish-release:/);assert.match(wf,/gh release create/);assert.ok(existsSync('src-tauri/icons/icon.ico'));});

test('Windows WebView2 deadlock prevention',()=>{const rust=readFileSync('src-tauri/src/lib.rs','utf8');assert.match(rust,/async fn search_images/);assert.match(rust,/url\.scheme\(\) == "about"/);assert.match(rust,/seekye:status/);});
