import { describe, it, expect, vi } from 'vitest';
import { Coordinator } from '../src/coordinator';
import { direct, parse } from '../src/shared';
import { classifyWithJev, jevAnswers, jevPayload, testJevKey } from '../src/jev';
const card = { id: 'abc', title: 'AI news', channel: '', text: '' };
describe('rules and Jev contract', () => {
  it('normalizes phrases, respects token boundaries and gives Hide precedence', () => {
    expect(parse(' AI, ai , robotics ')).toEqual(['ai', 'robotics']);
    expect(direct(card, { hide: ['ai news'], keep: ['ai'] })?.hide).toBe(true);
    expect(direct({ ...card, title: 'chair repair' }, { hide: ['ai'], keep: [] })).toBeUndefined();
    expect(direct(card, { hide: [], keep: [] })?.hide).toBe(false);
  });
  it('builds documented questions and validates typed answers with Hide precedence', async () => {
    const p = { hide: ['politics'], keep: ['ai'] };
    const payload = jevPayload([card], p, 'jev-1.13.0');
    expect(Object.keys(payload.questions)).toEqual(['hide_0', 'keep_0']);
    expect(payload).not.toHaveProperty('batch');
    const answers = { hide_0: { type: 'noul', noul: 0.9 }, keep_0: { type: 'noul', noul: 0.9 } };
    expect(jevAnswers({ answers }, 1, p)[0].hide).toBe(true);
    expect(() => jevAnswers({ answers: {} }, 1, p)).toThrow();
    const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ answers }), { status: 200 }));
    await classifyWithJev([card], p, 'user-test-key', fetcher);
    expect(fetcher.mock.calls[0]).toBeDefined();
    expect(fetcher.mock.calls[0][0]).toBe('https://api.typesafe.ai/v1/systemone');
    expect((fetcher.mock.calls[0][1] as RequestInit).headers).toEqual(expect.objectContaining({ Authorization: 'Bearer user-test-key' }));
    const modelFetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ models: [] }), { status: 200 }));
    await expect(testJevKey('user-test-key', modelFetcher)).resolves.toBeUndefined();
  });
  it('deduplicates concurrent cards, batches requests, caches and reevaluates changed preferences', async () => {
    const request = vi.fn(async (cards: typeof card[]) => cards.map(c => ({ hide: !/robot/i.test(c.title), source: 'jev' as const })));
    const worker = new Coordinator(request);
    const p = { hide: ['politics'], keep: ['robotics'] };
    const a = worker.classify(card, p), duplicate = worker.classify(card, p);
    const b = worker.classify({ ...card, id: 'def' }, p);
    expect(a).toBe(duplicate); await Promise.all([a, b]);
    expect(request).toHaveBeenCalledTimes(1); expect(request.mock.calls[0][0]).toHaveLength(2);
    await worker.classify({ ...card, text: 'new view count' }, p); expect(request).toHaveBeenCalledTimes(1);
    await worker.classify(card, { hide: ['celebrity gossip'], keep: ['manufacturing'] }); expect(request).toHaveBeenCalledTimes(2);
  });
  it('times out and caches a short failure cooldown', async () => {
    const request = vi.fn(() => new Promise<any>(() => {}));
    const worker = new Coordinator(request, () => {}, 20);
    const p = { hide: [], keep: ['robotics'] };
    expect(await worker.classify(card, p)).toEqual({ hide: false, source: 'fallback' });
    await worker.classify(card, p); expect(request).toHaveBeenCalledTimes(1);
  });
});
