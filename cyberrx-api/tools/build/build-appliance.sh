#!/usr/bin/env bash
#
# build-appliance.sh — VENDOR build pipeline for the hardened Nerion appliance
# (Layer 2: code protection). Run on the BUILD HOST, not shipped to customers.
#
# Produces, under dist-appliance/:
#   nerion-bin            single executable (SEA) — the launcher + enforcement gate
#   license_native.node   compiled native crypto/fingerprint addon
#   app.jsc               the application as V8 bytecode (no readable source)
#   config/               license_pub.pem + integrity.manifest (+ issued license.json)
#
# Each stage below is independently validated in this repo's tests; this script
# chains them. Stages that need a per-platform toolchain are called out.
#
# Prereqs on the build host: node 22+, gcc/make/python3 (node-gyp), and the dev
# deps (esbuild, javascript-obfuscator, bytenode, postject) installed.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
OUT="$ROOT/dist-appliance"
FUSE="NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2"

cd "$ROOT"
rm -rf "$OUT"; mkdir -p "$OUT/config"

echo "==> [1/6] Compile native enforcement addon (Ed25519 + SHA-256, Node OpenSSL)"
( cd native/license_native && npx --yes node-gyp rebuild )
cp native/license_native/build/Release/license_native.node "$OUT/license_native.node"

echo "==> [2/6] Obfuscate the enforcement path (control-flow flattening + string array)"
node tools/build/obfuscate.js --verify     # writes dist-obf/, fails if behaviour changed

echo "==> [3/6] Assemble app tree (source overlaid with obfuscated enforcement modules)"
APPSRC="$OUT/appsrc"; mkdir -p "$APPSRC"
rsync -a --exclude node_modules --exclude dist-appliance --exclude dist-obf \
      --exclude 'config/*.pem' --exclude 'config/license.json' ./ "$APPSRC/"
cp -f dist-obf/src/services/LicenseService.js       "$APPSRC/src/services/LicenseService.js"
cp -f dist-obf/src/services/TamperResponseService.js "$APPSRC/src/services/TamperResponseService.js"
cp -f dist-obf/src/middleware/licenseGate.js         "$APPSRC/src/middleware/licenseGate.js"
cp -f dist-obf/src/routes/license.js                 "$APPSRC/src/routes/license.js"

echo "==> [4/6] Compile the application to V8 bytecode (bytenode) — removes readable source"
# bytenode compiles each .js → .jsc; the launcher loads app.jsc. Per-Node-version
# artifact (ties the bytecode to the shipped node/SEA runtime — a feature, not a bug).
node -e "require('bytenode'); require('child_process')" 2>/dev/null || npm i -D bytenode >/dev/null
node tools/build/bytecode.js "$APPSRC" "$OUT"

echo "==> [5/6] Build the single executable (SEA) from the launcher"
node -e "require('esbuild').buildSync({entryPoints:['tools/build/launcher.js'],bundle:true,platform:'node',format:'cjs',outfile:'$OUT/launcher.js',external:['bytenode','pg','bcrypt','pptxgenjs','$ROOT/native/license_native']})"
node --experimental-sea-config tools/build/sea-config.json
cp "$(command -v node)" "$OUT/nerion-bin"
npx --yes postject "$OUT/nerion-bin" NODE_SEA_BLOB "$OUT/sea-prep.blob" --sentinel-fuse "$FUSE"
chmod +x "$OUT/nerion-bin"

echo "==> [6/6] Provision vault key + sign the integrity manifest over shipped files"
node tools/license/seal.js provision-vault
node tools/license/seal.js manifest        # covers the enforcement modules by default
cp config/license_pub.pem      "$OUT/config/license_pub.pem"
cp config/integrity.manifest   "$OUT/config/integrity.manifest"
cp config/.vault_key           "$OUT/config/.vault_key" 2>/dev/null || true

echo ""
echo "Appliance build complete → $OUT"
echo "  Ship: nerion-bin, license_native.node, app.jsc, config/ (+ a per-customer license.json)"
echo "  Set on the image:  LICENSE_ENFORCE=true  TAMPER_SEAL_ENFORCE=true  LICENSE_REQUIRE_NATIVE=true"
echo "  Do NOT ship: license_priv.pem, src/ (source), node_modules with dev deps."
