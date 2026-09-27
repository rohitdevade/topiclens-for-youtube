export type Prefs = { hide: string[]; keep: string[] };
export type Card = { id: string; title: string; channel: string; text: string };
export type Decision = { hide: boolean; source: 'rules' | 'jev' | 'fallback' };
export const normalize = (s: string) => s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
export const parse = (s: string): string[] => [...new Set(s.split(',').map(normalize).filter(Boolean))].sort();
export function prefs(value: any): Prefs { return { hide: parse(typeof value?.hide === 'string' ? value.hide : ''), keep: parse(typeof value?.keep === 'string' ? value.keep : '') }; }
export const prefKey = (p: Prefs) => JSON.stringify(p);
export const cacheKey = (c: Card, p: Prefs) => JSON.stringify([3, c.id, p]);
export function matches(text: string, topic: string): boolean { return (` ${normalize(text)} `).includes(` ${normalize(topic)} `); }
export function direct(c: Card, p: Prefs): Decision | undefined {
  if (!p.hide.length && !p.keep.length) return { hide: false, source: 'rules' };
  if (p.hide.some(t => matches(`${c.title} ${c.channel} ${c.text}`, t))) return { hide: true, source: 'rules' };
  if (!p.hide.length && p.keep.some(t => matches(`${c.title} ${c.channel} ${c.text}`, t))) return { hide: false, source: 'rules' };
}
