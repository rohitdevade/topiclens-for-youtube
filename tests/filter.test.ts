import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Filter } from '../src/filter';
import type { Card, Prefs } from '../src/shared';
let filter: Filter;
const semantic = (c: Card, p: Prefs) => {
  const text = `${c.title} ${c.channel} ${c.text}`.toLowerCase();
  const related = (topic: string) => topic === 'robotics' ? /robot|humanoid/.test(text) : text.includes(topic);
  return { hide: p.hide.some(related) || (p.keep.length > 0 && !p.keep.some(related)), source: 'jev' as const };
};
const card = (id: string, title: string, tag = 'ytd-rich-item-renderer') => `<${tag}><a id="video-title" href="/watch?v=${id}">${title}</a><span id="channel-name">Workshop</span></${tag}>`;
const tick = async () => { await vi.advanceTimersByTimeAsync(30); };
beforeEach(() => { vi.useFakeTimers(); document.body.innerHTML = ''; });
afterEach(() => { filter?.stop(); vi.clearAllTimers(); vi.useRealTimers(); });
describe('continuous card filtering', () => {
  it('updates existing cards, Hide wins, and clearing restores original elements', async () => {
    document.body.innerHTML = card('one', 'AI news') + card('two', 'Robots in a factory');
    const original = document.body.firstElementChild;
    filter = new Filter(async (c, p) => semantic(c, p));
    filter.setPreferences({ hide: ['ai news'], keep: ['ai'] }); await tick();
    expect([...document.body.children].map(n => n.getAttribute('data-topiclens'))).toEqual(['hidden', 'hidden']);
    filter.setPreferences({ hide: [], keep: ['robotics'] }); await tick();
    expect(document.body.lastElementChild?.hasAttribute('data-topiclens')).toBe(false);
    filter.setPreferences({ hide: [], keep: [] }); await tick();
    expect(document.querySelector('[data-topiclens]')).toBeNull(); expect(document.body.firstElementChild).toBe(original);
  });
  it('filters appended search cards and SPA navigation without duplicate mutation requests', async () => {
    const classify = vi.fn(async (c, p) => semantic(c, p));
    filter = new Filter(classify); filter.setPreferences({ hide: [], keep: ['robotics'] });
    document.body.insertAdjacentHTML('beforeend', card('one', 'Baking bread', 'ytd-video-renderer')); await tick();
    expect(document.body.firstElementChild?.getAttribute('data-topiclens')).toBe('hidden');
    for (let i = 0; i < 20; i++) document.body.firstElementChild!.append(document.createElement('span'));
    await tick(); expect(classify).toHaveBeenCalledTimes(1);
    document.body.innerHTML = card('two', 'Humanoid demo', 'yt-lockup-view-model');
    document.dispatchEvent(new Event('yt-navigate-finish')); await tick();
    expect(classify).toHaveBeenCalledTimes(2); expect(document.querySelector('[data-topiclens]')).toBeNull();
  });
  it('conceals uncertain cards, releases timeouts and ignores late answers', async () => {
    document.body.innerHTML = card('one', 'An unusual topic');
    let resolve!: (d: any) => void;
    filter = new Filter(() => new Promise(r => { resolve = r; }), 100);
    filter.setPreferences({ hide: [], keep: ['robotics'] }); await tick();
    expect(document.body.firstElementChild?.getAttribute('data-topiclens')).toBe('pending');
    await vi.advanceTimersByTimeAsync(100); expect(document.querySelector('[data-topiclens]')).toBeNull();
    resolve({ hide: true, source: 'jev' }); await tick(); expect(document.querySelector('[data-topiclens]')).toBeNull();
  });
  it('restores failures and ignores old preference replies', async () => {
    document.body.innerHTML = card('one', 'An unusual topic');
    filter = new Filter(async () => { throw new Error('offline'); });
    filter.setPreferences({ hide: [], keep: ['robotics'] }); await tick();
    expect(document.querySelector('[data-topiclens]')).toBeNull(); filter.stop();
    let resolve!: (d: any) => void;
    filter = new Filter(() => new Promise(r => { resolve = r; }));
    filter.setPreferences({ hide: [], keep: ['robotics'] }); await tick();
    filter.setPreferences({ hide: [], keep: [] }); await tick();
    resolve({ hide: true, source: 'jev' }); await tick(); expect(document.querySelector('[data-topiclens]')).toBeNull();
  });
  it('rechecks recycled cards and hides only the outer rich slot', async () => {
    document.body.innerHTML = `<ytd-rich-item-renderer>${card('one', 'Robots', 'yt-lockup-view-model')}</ytd-rich-item-renderer>`;
    filter = new Filter(async (c, p) => semantic(c, p)); filter.setPreferences({ hide: ['politics'], keep: [] }); await tick();
    const a = document.querySelector('a')!; a.textContent = 'Politics today'; a.setAttribute('href', '/watch?v=two'); await tick();
    expect(document.querySelectorAll('[data-topiclens="hidden"]')).toHaveLength(1);
    expect(document.body.firstElementChild?.getAttribute('data-topiclens')).toBe('hidden');
  });
});
