import { type Card, type Prefs, type Decision, direct, prefKey } from './shared';
export const CARD_SELECTOR = 'ytd-rich-item-renderer,ytd-video-renderer,ytd-grid-video-renderer,ytd-compact-video-renderer,yt-lockup-view-model,ytd-reel-item-renderer,ytm-shorts-lockup-view-model';
export function readCard(el: Element): Card | undefined {
  const links = [...el.querySelectorAll<HTMLAnchorElement>('a[href]')];
  const link = links.find(a => /(?:\/watch\?.*v=|\/shorts\/)/.test(a.getAttribute('href') ?? ''));
  if (!link) return;
  const url = new URL(link.getAttribute('href')!, 'https://www.youtube.com');
  const id = url.searchParams.get('v') ?? url.pathname.match(/^\/shorts\/([^/]+)/)?.[1];
  if (!id || !/^[\w-]{1,64}$/.test(id)) return;
  const titleEl = el.querySelector('#video-title, .yt-lockup-metadata-view-model__title, h3, .shortsLockupViewModelHostMetadataTitle');
  const title = (titleEl?.textContent || link.getAttribute('title') || link.getAttribute('aria-label') || '').trim().slice(0, 300);
  if (!title) return;
  const channel = (el.querySelector('#channel-name, .yt-content-metadata-view-model__metadata-text a, a[href^="/@"]')?.textContent ?? '').trim().slice(0, 120);
  // Only specific card metadata, never hidden page data or transcripts.
  const text = [...el.querySelectorAll('#description-text,.metadata-snippet-text,.yt-content-metadata-view-model__metadata-text')].map(n => n.textContent ?? '').join(' ').trim().slice(0, 600);
  return { id, title, channel, text };
}
export class Filter {
  private preferences: Prefs = { hide: [], keep: [] };
  private records = new WeakMap<Element, { signature: string; token: object }>();
  private queued = new Set<Element>();
  private scheduled = false;
  private observer: MutationObserver;
  private navigation = () => this.scan(document);
  constructor(private classify: (card: Card, p: Prefs) => Promise<Decision>, private timeout = 6500) {
    this.observer = new MutationObserver(ms => {
      for (const m of ms) {
        this.enqueue(m.target.nodeType === 1 ? m.target as Element : m.target.parentElement);
        for (const node of m.addedNodes) if (node instanceof Element) this.scan(node);
      }
    });
    this.observer.observe(document, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['href', 'title', 'aria-label'] });
    document.addEventListener('yt-navigate-finish', this.navigation);
    document.addEventListener('yt-page-data-updated', this.navigation);
    window.addEventListener('popstate', this.navigation);
  }
  setPreferences(p: Prefs) { this.preferences = p; this.scan(document); }
  private enqueue(el: Element | null) {
    const card = el?.closest(CARD_SELECTOR);
    if (!card) return;
    // A rich card may contain a lockup: hide its outer slot, never both.
    const outer = card.parentElement?.closest(CARD_SELECTOR) ?? card;
    // MutationObserver runs before paint. Conceal newly inserted slots now,
    // before the chunked inspection task, so new thumbnails cannot flash.
    if (this.preferences.keep.length && !this.records.has(outer)) outer.setAttribute('data-topiclens', 'pending');
    this.queued.add(outer);
    if (!this.scheduled) { this.scheduled = true; setTimeout(() => this.flush(), 0); }
  }
  private scan(root: ParentNode) {
    if (root instanceof Element) this.enqueue(root);
    root.querySelectorAll(CARD_SELECTOR).forEach(el => this.enqueue(el));
  }
  private flush() {
    this.scheduled = false;
    const batch = [...this.queued].slice(0, 40);
    for (const el of batch) { this.queued.delete(el); if (el.isConnected) this.process(el); }
    if (this.queued.size) { this.scheduled = true; setTimeout(() => this.flush(), 0); }
  }
  private process(el: Element) {
    const card = readCard(el), p = this.preferences;
    if (!card) { this.records.delete(el); el.removeAttribute('data-topiclens'); return; }
    const signature = JSON.stringify([card, prefKey(p)]);
    if (this.records.get(el)?.signature === signature) return;
    const token = {};
    this.records.set(el, { signature, token });
    const apply = (d: Decision) => {
      if (this.records.get(el)?.token !== token) return;
      if (d.hide) el.setAttribute('data-topiclens', 'hidden'); else el.removeAttribute('data-topiclens');
    };
    const known = direct(card, p);
    if (known) { apply(known); return; }
    if (p.keep.length) el.setAttribute('data-topiclens', 'pending'); else el.removeAttribute('data-topiclens');
    let settled = false;
    const timer = setTimeout(() => { settled = true; apply({ hide: false, source: 'fallback' }); }, this.timeout);
    this.classify(card, p).then(d => { if (!settled) apply(d); }).catch(() => { if (!settled) apply({ hide: false, source: 'fallback' }); }).finally(() => { settled = true; clearTimeout(timer); });
  }
  stop() { this.observer.disconnect(); document.removeEventListener('yt-navigate-finish', this.navigation); document.removeEventListener('yt-page-data-updated', this.navigation); window.removeEventListener('popstate', this.navigation); }
}
