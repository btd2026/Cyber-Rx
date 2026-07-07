# Nerion Appliance — Licensing & Anti-Reverse-Engineering

This is the vendor operator guide for shipping Nerion as a **self-contained VM
appliance** where the customer's data never leaves their environment, the
license enforces an **expiry clock** (14-day trial / 365-day paid), and the box
is hardened so casual copying/tampering is impractical and **tamper-evident**.

> **Honest threat model.** You cannot make a VM the customer fully controls
> *impossible* to reverse-engineer — a determined attacker with root on their own
> hardware can, given enough effort, patch a running process. The realistic and
> achievable goal is: **cost-to-break ≫ value-of-breaking, every tamper is
> detectable, the license is hardware-bound and self-expiring, and abuse is
> legally actionable.** The four layers below combine to reach that bar; no single
> layer is a silver bullet.

---

## Layer 1 — Offline signed license + expiry clock  ✅ implemented

Fully offline (no phone-home — matches "data never leaves the environment").
Enforcement is cryptographic, not honor-system.

### Components
| File | Role |
|------|------|
| `src/services/LicenseService.js` | Verifies the Ed25519 signature, evaluates state (active/grace/expired/tampered/wrong_machine/clock_suspect), computes the machine fingerprint, and maintains the anti-clock-rollback high-water mark. |
| `src/middleware/licenseGate.js` | Express middleware. When `LICENSE_ENFORCE=true`, blocks the API with **402** unless the license is `active`/`grace`. Always leaves `/api/license/*` and health probes open. |
| `src/routes/license.js` | `GET /api/license/status` (drives the in-app banner) and `GET /api/license/fingerprint` (the value you paste into the issuer). |
| `tools/license/keygen.js` | **Vendor-only.** Generates the Ed25519 signing keypair. |
| `tools/license/issue.js` | **Vendor-only.** Mints a signed `license.json` for one customer/appliance. |

### One-time vendor setup
```bash
# Generate the signing keypair ONCE. Keep the private key in your secrets vault.
node tools/license/keygen.js
#   config/license_priv.pem  → SECRET, gitignored, never ships
#   config/license_pub.pem   → embedded in every VM image (safe to ship)
```

### Per-customer issuance
```bash
# 1. On the customer's appliance, read its hardware fingerprint:
curl -s http://localhost:3001/api/license/fingerprint    # or:
node -e "console.log(require('./src/services/LicenseService').machineFingerprint())"

# 2. On YOUR machine (with the private key), mint the license:
node tools/license/issue.js \
  --customer "Acme Bank" \
  --plan paid \
  --machine <fingerprint-from-step-1> \
  --out license.json

# 3. Drop license.json into the appliance's config/ directory. Enforcement is on
#    when the image sets LICENSE_ENFORCE=true.
```

Trial vs paid: `--plan trial` → 14 days, `--plan paid` → 365 days. Override with
`--days N`. Post-expiry grace defaults to 7 days (`--grace N`).

### What it defends against
- **Expiry evasion by editing the file** → signature breaks → `tampered` (blocked).
- **Copying the appliance to more VMs** → fingerprint mismatch → `wrong_machine`.
- **Winding the system clock back** to dodge expiry → high-water mark trips
  `clock_suspect` (blocked). The state file is HMAC-bound to the machine, so it
  can't be rewound with a text editor.
- **Forging a license** → requires the private key, which never ships.

### Enforcement flag
`LICENSE_ENFORCE` is **off by default** (so the hosted SaaS demo is unaffected).
Set `LICENSE_ENFORCE=true` **only in the shipped appliance image**.

---

## Layer 1b — Tamper dead-man seal (self-destruct-on-tamper)  ✅ implemented

If someone tampers with the appliance, it **crypto-shreds the vendor's protected
material and seals itself** — locking the platform until you re-arm it.

> **What "self-destruct" means here — read this.** It destroys the *vendor's*
> secret (the vault key that decrypts your obfuscated code/asset bundle) and
> bricks the *application*. It **never touches, wipes, or encrypts the customer's
> data.** A trigger that destroyed customer data would turn any false positive (a
> legitimate snapshot restore, an NTP correction, a host migration) into the
> destruction of a paying customer's environment — a liability, not a feature.
> Crypto-shredding vendor material achieves the anti-piracy goal without that
> blast radius, and is the industry-standard approach (crypto-erase).

### Severity model (false-positive-safe)
| Signal | Severity | Response |
|---|---|---|
| License signature broken (file edited) | **HARD** | seal + crypto-shred vault key |
| Protected file hash ≠ signed manifest (binary patched) | **HARD** | seal + crypto-shred vault key |
| `wrong_machine` (VM cloned/migrated) | SOFT | block (402), **no shred** — re-issue license |
| `clock_suspect` (clock rolled back) | SOFT | block (402), **no shred** — re-issue license |

HARD signals are *cryptographically certain* and cannot arise from benign
operations. SOFT signals have legitimate causes, so they never destroy anything.

### Components
| File | Role |
|------|------|
| `src/services/TamperResponseService.js` | `assess()` verdict, `enforceAtStartup()` (seal+shred on HARD), `unseal()` recovery, integrity-manifest verify, vault-key crypto-shred. |
| `tools/license/seal.js` | **Vendor-only.** `manifest` (sign protected-file hashes at build time), `provision-vault` (create the shred-able key), `unseal-token` (mint a recovery token). |
| `routes/license.js` | `GET /api/license/seal` (fingerprint + nonce for recovery) and `POST /api/license/unseal` (apply a recovery token). |
| `middleware/licenseGate.js` | Returns **423 Locked** on every request when sealed; runs `enforceAtStartup()` at boot. |

### Build-time (vendor)
```bash
node tools/license/seal.js provision-vault          # create the shred-able vault key
# ...after the code bundle is final...
node tools/license/seal.js manifest                 # sign hashes of the enforcement path
#   → config/integrity.manifest  (embed in the image)
# Enforcement is on when the image sets TAMPER_SEAL_ENFORCE=true
```

### Recovery (after an accidental HARD trip on a paying customer)
```bash
# 1. Operator reads the seal off the box:
curl -s http://localhost:3001/api/license/seal      # → { fingerprint, nonce }
# 2. You (vendor) mint a single-use, machine-bound token:
node tools/license/seal.js unseal-token --fingerprint <fp> --nonce <nonce>
# 3. Operator applies it:
curl -X POST http://localhost:3001/api/license/unseal -H 'Content-Type: application/json' -d @unseal.json
#   → seal cleared, vault key re-provisioned, platform live again
```

The unseal token is Ed25519-signed by your private key and bound to **that exact
machine fingerprint + that exact seal nonce**, so it's single-use and can't be
replayed on another box or another seal event.

> **Honest limit.** A root attacker on their own VM can patch out the boot-time
> check *before* it fires. That's why Layer 1b is paired with Layer 2 (compile
> the check into a native binary/addon + boot integrity self-check) — the
> manifest hash makes patching the enforcement path itself a HARD tamper, closing
> the obvious bypass for anyone who doesn't first defeat Layer 2.

---

## Layer 2 — Code protection (compiled, no readable source)  ✅ implemented

Ships the appliance as a **single executable + V8 bytecode + a native crypto
addon** — no loose `.js` to read or patch — with the enforcement path additionally
obfuscated and covered by the signed integrity manifest.

### Components (all validated in-repo)
| Piece | What it does | Proof |
|------|------|------|
| `native/license_native/` | C N-API addon doing Ed25519 verify + SHA-256 fingerprint via Node's bundled OpenSSL (no external libs). The enforcement crypto lives in compiled code, not editable JS. | `tests/unit/LicenseNative.test.js` (parity with Node crypto) |
| LicenseService native wiring | Prefers the addon; `LICENSE_REQUIRE_NATIVE=true` makes its **absence a hard fail** (`tampered`), so you can't neuter enforcement by deleting the `.node`. | verified: hidden addon + require-native → `tampered` |
| `tools/build/obfuscate.js` | Control-flow flattening + string-array on the enforcement modules only. Internal logic/strings gone; runtime behaviour preserved. | `--verify` re-checks a real signature after obfuscation |
| `tools/build/bytecode.js` | Compiles the assembled app tree to `.jsc` V8 bytecode (via `bytenode`) — no readable source ships. | verified: `.jsc` loads, verifies, rejects tampers |
| `tools/build/launcher.js` + `sea-config.json` | The single executable (Node SEA): runs the license + tamper gate FIRST, then hands off to the on-disk bytecode app via `createRequire`. | verified: a real SEA binary ran our license logic with **no source tree / no node_modules** |
| `tools/build/build-appliance.sh` | Chains all of the above into `dist-appliance/`. | — |

### Build (on the vendor build host)
```bash
npm ci                       # incl. dev tools: esbuild, javascript-obfuscator, bytenode
npm run native:build         # compile the native addon
npm run build:appliance      # → dist-appliance/{nerion-bin, license_native.node, app.jsc, config/}
```
Set on the shipped image: `LICENSE_ENFORCE=true TAMPER_SEAL_ENFORCE=true LICENSE_REQUIRE_NATIVE=true`.

### Why a launcher, not a whole-app bundle (honest engineering note)
Node's SEA embeds one script whose built-in `require()` resolves **core modules
only**. Nerion is 100+ routes with native deps (`pg`, `bcrypt`) and dynamic
directory-scanning requires, which a single esbuild bundle can't faithfully
reproduce — forcing it risks a subtly-broken binary. So the single binary is a
thin launcher; the app ships as bytecode loaded via `createRequire`. This is the
robust, validated shape for a large app — not a shortcut.

### Honest limits
- V8 bytecode keeps **exported symbol names** and some string constants in its
  pool (that's why we obfuscate the enforcement modules *before* compiling). It
  stops casual source reading and editing; it is not encryption.
- A root attacker on their own VM can still attach a debugger to the running
  process. Layer 1b's integrity manifest makes patching the shipped artifacts a
  HARD tamper (seal + shred), and Layer 3 (encrypted disk, no shell, measured
  boot) is what raises the runtime-attack bar. No single layer is absolute; the
  stack makes breaking it cost far more than a license.

---

## Layer 3 — VM appliance hardening  ▢ recipe

Ship an image the customer runs but can't easily crack open:

1. **Encrypted root/data volume** (LUKS). Data-at-rest never leaves; a stolen
   `.vmdk`/`.qcow2` is ciphertext.
2. **No interactive shell / locked-down OS**: minimal base (e.g. distroless or a
   hardened Alpine), no SSH by default, app runs as a non-root service, read-only
   root filesystem with a writable overlay only for `config/` + data volume.
3. **Secure boot + measured boot** where the hypervisor supports it; bind the LUKS
   key release to the measured state so tampering with the boot chain locks the
   disk.
4. **Bind the license fingerprint to virtual hardware** (already supported) so
   cloning the VM to another host trips `wrong_machine`.
5. **Auto-lock on expiry**: the 402 gate degrades the platform to the license
   banner; combine with a systemd timer that stops the service at hard-expiry.

---

## Layer 4 — Legal / EULA  ▢ recipe

Make abuse actionable, which is what actually deters commercial customers:

1. **EULA** prohibiting reverse-engineering, decompilation, re-hosting, and
   license circumvention; per-VM / per-fingerprint license grant.
2. **Trial terms** (14 days, evaluation-only, no production data warranty).
3. **Audit clause** + telemetry-off-by-default statement (reinforces "your data
   stays in your environment").
4. Present acceptance at first boot; record acceptance in the (signed) state file.

---

## Status
- **Layer 1: implemented + tested** (`tests/unit/LicenseService.test.js`, 13 cases).
- **Layer 1b (tamper seal): implemented + tested** (`tests/unit/TamperResponseService.test.js`, 18 cases).
- Layers 2–4: recipes above; build on request. (Layer 2 is the natural next step —
  it hardens Layer 1b's boot-time check against being patched out.)
