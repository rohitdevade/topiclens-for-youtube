import { Filter } from './filter';
import { prefs } from './shared';
const filter = new Filter(async (card, preferences) => {
  const result = await chrome.runtime.sendMessage({ type: 'classify', card, preferences });
  if (!result || typeof result.hide !== 'boolean') throw new Error('Classification unavailable');
  return result;
});
let changed = false;
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.preferences) { changed = true; filter.setPreferences(prefs(changes.preferences.newValue)); }
});
chrome.storage.local.get('preferences').then(r => { if (!changed) filter.setPreferences(prefs(r.preferences)); }).catch(() => {});
