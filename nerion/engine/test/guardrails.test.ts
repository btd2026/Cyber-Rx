import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : [];
  });
}

describe('aggregation guardrail — no arithmetic mean of entity results, anywhere', () => {
  const files = walk(join(__dirname, '..', 'src'));

  it('no source divides a sum by an entity count', () => {
    // dividing anything by the number of entities is how a mean-of-entities
    // sneaks in. Aggregation must be by COUNT of entities per state instead.
    const banned = /\/\s*(ENTS\.length|entities\.length|TOTAL_ENTITIES|reach\.total)\b/;
    const offenders = files.filter((f) => banned.test(readFileSync(f, 'utf8')));
    expect(offenders, offenders.join(', ')).toEqual([]);
  });

  it('no source computes a mean/average over entity scores', () => {
    const banned = /(mean|average)[A-Za-z]*\s*\([^)]*(entit|ENTS)/i;
    const offenders = files.filter((f) => banned.test(readFileSync(f, 'utf8')));
    expect(offenders, offenders.join(', ')).toEqual([]);
  });
});
