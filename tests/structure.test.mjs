import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
test('static Next.js export',()=>{const cfg=readFileSync('next.config.mjs','utf8');assert.match(cfg,/output:\s*'export'/);});
test('Yandex automation and event wiring',()=>{const rust=readFileSync('src-tauri/src/lib.rs','utf8');const js=readFileSync('src-tauri/src/automation.js','utf8');assert.match(rust,/seekye:results/);assert.match(js,/seekye-results:\/\/done/);assert.match(js,/\/images\/search/);});
test('both CI providers',()=>{assert.ok(existsSync('.github/workflows/build-macos.yml'));assert.ok(existsSync('.gitlab-ci.yml'));});
