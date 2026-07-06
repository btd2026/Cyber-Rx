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

## Layer 2 — Code protection (raise reverse-engineering cost)  ▢ recipe

Ship compiled/obfuscated artifacts, not readable source:

1. **Bundle + minify + obfuscate** the Node backend (e.g. `esbuild` to a single
   file, then `javascript-obfuscator` with string-array + control-flow flattening
   for the license/enforcement modules specifically).
2. **Compile to a binary** with the Node SEA (Single Executable Application) API
   or `pkg`, so there is no loose `.js` to edit. Strip source maps.
3. **Move the license check into a native addon** (small Rust/C `.node` module)
   so the verify + fingerprint logic isn't trivially patchable in JS. Have the
   addon hold the public key and refuse to run if the JS caller is missing.
4. **Anti-debug / integrity self-check**: on boot, hash the critical binaries and
   compare to a signed manifest; refuse to start on mismatch.

> These raise the effort bar; they don't make it impossible. Prioritize
> obfuscating the *enforcement path* over the whole app.

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
- Layers 2–4: recipes above; build on request.
