import { testJevKey } from './jev';
const keyInput = document.querySelector<HTMLInputElement>('#api-key')!;
const toggle = document.querySelector<HTMLButtonElement>('#toggle')!;
const save = document.querySelector<HTMLButtonElement>('#save')!;
const remove = document.querySelector<HTMLButtonElement>('#remove')!;
const status = document.querySelector<HTMLParagraphElement>('#status')!;
const report = (message: string, error = false) => { status.textContent = message; status.classList.toggle('error', error); };
chrome.storage.local.get<{ jevApiKey?: string }>('jevApiKey').then(({ jevApiKey }) => { keyInput.value = jevApiKey ?? ''; });
toggle.addEventListener('click', () => {
  const reveal = keyInput.type === 'password'; keyInput.type = reveal ? 'text' : 'password';
  toggle.textContent = reveal ? 'Hide' : 'Show'; toggle.setAttribute('aria-label', `${reveal ? 'Hide' : 'Show'} API key`);
});
save.addEventListener('click', async () => {
  const apiKey = keyInput.value.trim();
  if (!apiKey) { report('Enter a Jev API key.', true); return; }
  save.disabled = true; report('Testing connection…');
  try { await testJevKey(apiKey); await chrome.storage.local.set({ jevApiKey: apiKey }); report('Connected. TopicLens will now classify with Jev.'); }
  catch (error) { report(error instanceof Error ? error.message : 'Could not connect to Jev.', true); }
  finally { save.disabled = false; }
});
remove.addEventListener('click', async () => { await chrome.storage.local.remove(['jevApiKey', 'decisionCache']); keyInput.value = ''; report('API key removed.'); });
