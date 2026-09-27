import { type Card, type Prefs, type Decision, cacheKey, direct, prefKey } from './shared';
type Entry = { decision: Decision; expires: number };
type Job = { key: string; card: Card; preferences: Prefs; resolve: (d: Decision) => void };
export class Coordinator {
  cache = new Map<string, Entry>();
  private pending = new Map<string, Promise<Decision>>();
  private queue: Job[] = [];
  private active = 0;
  private timer?: ReturnType<typeof setTimeout>;
  constructor(private request: (cards: Card[], preferences: Prefs) => Promise<Decision[]>, private save = () => {}, private deadline = 5000) {}
  classify(card: Card, preferences: Prefs): Promise<Decision> {
    const known = direct(card, preferences); if (known) return Promise.resolve(known);
    const key = cacheKey(card, preferences), cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) return Promise.resolve(cached.decision);
    const existing = this.pending.get(key); if (existing) return existing;
    const promise = new Promise<Decision>(resolve => { this.queue.push({ key, card, preferences, resolve }); });
    this.pending.set(key, promise);
    if (!this.timer) this.timer = setTimeout(() => { this.timer = undefined; this.pump(); }, 35);
    return promise;
  }
  private pump() {
    while (this.active < 2 && this.queue.length) {
      const first = this.queue.shift()!, jobs = [first];
      for (let i = 0; i < this.queue.length && jobs.length < 8;) {
        if (prefKey(this.queue[i].preferences) === prefKey(first.preferences)) jobs.push(this.queue.splice(i, 1)[0]); else i++;
      }
      this.active++;
      let timer: ReturnType<typeof setTimeout>;
      Promise.race([this.request(jobs.map(j => j.card), first.preferences), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), this.deadline); })])
        .then(ds => { if (ds.length !== jobs.length || ds.some(d => typeof d?.hide !== 'boolean')) throw new Error('Invalid results'); return ds; })
        .catch(() => jobs.map((): Decision => ({ hide: false, source: 'fallback' })))
        .then(ds => jobs.forEach((job, i) => {
          const decision = ds[i];
          this.cache.set(job.key, { decision, expires: Date.now() + (decision.source === 'fallback' ? 30000 : 7 * 86400000) });
          this.pending.delete(job.key); job.resolve(decision);
        })).finally(() => {
          clearTimeout(timer!); this.active--;
          while (this.cache.size > 1500) this.cache.delete(this.cache.keys().next().value!);
          this.save(); this.pump();
        });
    }
  }
}
