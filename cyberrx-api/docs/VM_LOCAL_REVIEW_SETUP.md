# VM appliance — local document review setup

> **REMINDER (read this when you build the VM):** to get better-than-keyword
> document review **fully offline**, install **Ollama** inside the VM and pull a
> small model. Without it, the appliance still runs — document review just falls
> back to the deterministic keyword engine (no crash, no hang).

The document-review code ships with three engines behind one interface; you pick
which with a single env var. The appliance runs `local`.

| Engine    | Runs where            | Internet | Per-token cost | Quality                 |
| --------- | --------------------- | -------- | -------------- | ----------------------- |
| `keyword` | in-VM                 | none     | free           | baseline (always-on)    |
| `local`   | in-VM (Ollama/…)      | none     | free           | better than keyword     |
| `cloud`   | Anthropic API         | yes      | ~$0.10–0.25/doc| best                    |

The only internet the appliance needs for `local` is your DTNKShield benchmark
portal. Nothing about document review leaves the VM.

## Steps at VM build time

1. **Install Ollama** (Linux):
   ```sh
   curl -fsSL https://ollama.com/install.sh | sh
   ```
   (Or bake the Ollama binary + model into the VM image so the built appliance
   needs no internet at all.)

2. **Pull a small model** (7–8B is the sweet spot for CPU/modest GPU):
   ```sh
   ollama pull llama3.1:8b      # or: qwen2.5:7b, mistral:7b
   ```

3. **Point the API at it** — set these env vars for the `cyberrx-api` process:
   ```sh
   DOC_REVIEW_ENGINE=local
   LOCAL_LLM_URL=http://localhost:11434/v1/chat/completions   # Ollama's OpenAI-compatible endpoint
   LOCAL_LLM_MODEL=llama3.1:8b
   ```

4. **Verify** — upload one policy in onboarding. In the API logs you should see:
   ```
   document review · local (no per-token cost)  {"model":"llama3.1:8b", ...}
   ```
   and the document should show the **✦ AI-reviewed** badge in the Program Health
   → Documents reviewed panel, with verbatim evidence quotes.

## Notes

- **Latency:** on CPU a 7–8B model is seconds to ~a minute per document — fine for
  onboarding (this is not a real-time path).
- **Grounding guardrail is on:** any "evidence" the local model can't quote
  verbatim from the document is discarded, and if it grounds nothing the review
  falls back to keyword — so a smaller model can't fabricate findings.
- **Fallback is automatic:** if Ollama is down or unreachable, `local` returns
  nothing and the endpoint uses the keyword engine. The appliance never breaks.
- **No learning / fine-tuning required:** the engine matches against the fixed
  d1–d16 control catalog via prompt + grounding, not a trained model. You do not
  need a dataset, a GPU training run, or a LoRA to beat keyword.
- **Spend ledger:** local runs are recorded at `$0` in `GET /api/documents/spend`
  so you can still see review throughput per engine.
- **Switching to cloud** (a hosted, non-appliance client) is just
  `DOC_REVIEW_ENGINE=cloud` + `ANTHROPIC_API_KEY`. `DOC_REVIEW_ENGINE=auto`
  prefers cloud when a key is present, else local, else keyword.
