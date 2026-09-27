export {};
const hide = document.querySelector<HTMLTextAreaElement>('#hide')!;
const keep = document.querySelector<HTMLTextAreaElement>('#keep')!;
const status = document.querySelector<HTMLElement>('#status')!;
document.querySelector<HTMLButtonElement>('#settings')!.addEventListener('click', () => chrome.runtime.openOptionsPage());
hide.disabled = keep.disabled = true;
chrome.storage.local.get<{ preferences?: { hide: string; keep: string } }>('preferences').then(({ preferences }) => {
  hide.value = preferences?.hide ?? ''; keep.value = preferences?.keep ?? '';
  hide.disabled = keep.disabled = false;
}).catch(() => { status.textContent = 'Could not load preferences. Reopen this popup.'; });
let writes = Promise.resolve();
for (const input of [hide, keep]) input.addEventListener('input', () => {
  const preferences = { hide: hide.value, keep: keep.value };
  status.textContent = 'Saving…';
  writes = writes.then(() => chrome.storage.local.set({ preferences })).then(() => { status.textContent = 'Saved automatically'; }).catch(() => { status.textContent = 'Save failed. Please try again.'; });
});
