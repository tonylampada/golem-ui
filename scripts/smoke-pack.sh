#!/usr/bin/env bash
# Packs the kit and installs the tarball into a throwaway Vite app outside the repo, so what the
# smoke test exercises is the published artifact and not the source tree.
#
# Reads no npm credentials and writes no ~/.npmrc: `npm pack` and `npm install <tarball>` only.
set -euo pipefail

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
app="$(mktemp -d)"
trap 'rm -rf "$app"' EXIT

echo "==> building"
cd "$repo"
pnpm build

echo "==> packing"
tarball="$app/$(npm pack --pack-destination "$app" --silent)"
echo "$tarball"

echo "==> throwaway app in $app"
cd "$app"
cat > package.json <<'JSON'
{
  "name": "golem-ui-smoke",
  "private": true,
  "type": "module",
  "scripts": { "build": "vite build" }
}
JSON

cat > index.html <<'HTML'
<!doctype html>
<html>
  <body>
    <div id="root"></div>
    <script type="module" src="/main.tsx"></script>
  </body>
</html>
HTML

# One component, its styles, and the fakes — the whole surface a consumer touches on day one.
cat > main.tsx <<'TSX'
import { createRoot } from 'react-dom/client'
import { Shell, fakeIdentity, fakeNavigation } from 'golem-ui'
import 'golem-ui/styles.css'

const adapters = {
  identity: fakeIdentity(),
  navigation: fakeNavigation({ path: '/today', params: {} }),
}

createRoot(document.getElementById('root')!).render(
  <Shell
    config={{ title: 'Smoke Cycles' }}
    adapters={adapters}
    chat={<p>chat side</p>}
    canvas={<h2>canvas side</h2>}
  />,
)
TSX

npm install --no-audit --no-fund \
  "$tarball" react@^19 react-dom@^19 \
  -D vite @vitejs/plugin-react typescript @types/react @types/react-dom

cat > vite.config.ts <<'TS'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({ plugins: [react()] })
TS

echo "==> typechecking the consumer against the published .d.ts"
cat > tsconfig.json <<'JSON'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["vite/client"]
  },
  "include": ["main.tsx"]
}
JSON
npx tsc -p tsconfig.json

echo "==> building the consumer app"
npm run build

echo "==> checking the bundle"
js="$(cat dist/assets/*.js)"
css="$(cat dist/assets/*.css)"
grep -q 'Smoke Cycles' <<<"$js" || { echo "FAIL: component did not reach the bundle"; exit 1; }
grep -q 'golem-component' <<<"$css" || { echo "FAIL: golem-ui/styles.css did not reach the bundle"; exit 1; }

echo
echo "PASS: the packed tarball installs, typechecks, builds and carries its styles."
