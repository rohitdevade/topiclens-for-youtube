import { Coordinator } from './coordinator';
import { classifyWithJev } from './jev';

let persistTimer: ReturnType<typeof setTimeout>;
let apiKey = '';
const makeCoordinator = () => {
  const instance = new Coordinator((cards, preferences) => classifyWithJev(cards, preferences, apiKey), () => {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => chrome.storage.local.set({ decisionCache: [...instance.cache] }).catch(() => {}), 150);
  });
  return instance;
};
let coordinator = makeCoordinator();
const ready = chrome.storage.local.get(['decisionCache', 'jevApiKey']).then(r => {
  apiKey = typeof r.jevApiKey === 'string' ? r.jevApiKey : '';
  if (Array.isArray(r.decisionCache)) for (const [key, entry] of r.decisionCache) if (entry.expires > Date.now()) coordinator.cache.set(key, entry);
}).catch(() => {});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.jevApiKey) return;
  apiKey = typeof changes.jevApiKey.newValue === 'string' ? changes.jevApiKey.newValue : '';
  coordinator = makeCoordinator();
  chrome.storage.local.remove('decisionCache').catch(() => {});
});

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.type !== 'classify' || sender.id !== chrome.runtime.id || !sender.url?.startsWith('https://www.youtube.com/')) return;
  ready.then(() => coordinator.classify(message.card, message.preferences)).then(respond).catch(() => respond({ hide: false, source: 'fallback' }));
  return true;
});
