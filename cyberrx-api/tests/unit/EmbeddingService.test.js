'use strict';

/** EmbeddingService (Voyage) tests — mocks global.fetch; no network. */

const ORIG = { ...process.env };
global.fetch = jest.fn();

function load() { jest.resetModules(); return require('../../src/services/rag/EmbeddingService'); }
const ok = (data) => ({ ok: true, status: 200, json: async () => data, text: async () => '' });

beforeEach(() => { jest.clearAllMocks(); process.env = { ...ORIG }; });
afterAll(() => { process.env = ORIG; });

describe('EmbeddingService.embed (voyage)', () => {
  test('returns [] for empty input without calling the API', async () => {
    process.env.VOYAGE_API_KEY = 'k';
    const E = load();
    expect(await E.embed([])).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('throws a clear error when no API key is configured', async () => {
    delete process.env.VOYAGE_API_KEY;
    const E = load();
    await expect(E.embed(['hello'])).rejects.toThrow(/VOYAGE_API_KEY is not set/);
  });

  test('sends model + input_type with bearer auth and returns vectors in order', async () => {
    process.env.VOYAGE_API_KEY = 'tok'; process.env.VOYAGE_MODEL = 'voyage-3';
    const E = load();
    global.fetch.mockResolvedValueOnce(ok({ data: [
      { index: 1, embedding: [0.2, 0.2] },
      { index: 0, embedding: [0.1, 0.1] }, // returned out of order on purpose
    ] }));
    const vecs = await E.embed(['a', 'b'], { inputType: 'document' });
    expect(vecs).toEqual([[0.1, 0.1], [0.2, 0.2]]); // re-sorted by index
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toBe(E.VOYAGE_URL);
    expect(opts.headers.Authorization).toBe('Bearer tok');
    const body = JSON.parse(opts.body);
    expect(body).toMatchObject({ model: 'voyage-3', input_type: 'document', input: ['a', 'b'] });
  });

  test('batches inputs beyond the batch size cap', async () => {
    process.env.VOYAGE_API_KEY = 'tok'; process.env.EMBED_BATCH_SIZE = '2';
    const E = load();
    global.fetch
      .mockResolvedValueOnce(ok({ data: [{ index: 0, embedding: [1] }, { index: 1, embedding: [2] }] }))
      .mockResolvedValueOnce(ok({ data: [{ index: 0, embedding: [3] }] }));
    const vecs = await E.embed(['a', 'b', 'c']);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(vecs).toEqual([[1], [2], [3]]);
  });

  test('surfaces an API error', async () => {
    process.env.VOYAGE_API_KEY = 'tok';
    const E = load();
    global.fetch.mockResolvedValueOnce({ ok: false, status: 429, text: async () => 'rate limited' });
    await expect(E.embed(['a'])).rejects.toThrow(/Voyage embeddings HTTP 429/);
  });
});
