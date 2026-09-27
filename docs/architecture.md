# Architecture

TopicLens uses four small browser-side components.

```text
YouTube DOM
   │ title, channel, visible card text
   ▼
Content script ── classify message ──► MV3 service worker
   ▲                                     │
   │ reversible attributes              ├─ local phrase rules
   │                                     ├─ cache + request deduplication
   └──────── decision ◄──────────────────└─ Jev System One API

Popup ── Hide / Show only ──► chrome.storage.local
Options ── user's Jev key ──► chrome.storage.local
```

The content script observes supported YouTube card containers and queues only new or changed cards. It never deletes cards. Filtering uses a `data-topiclens` attribute with extension CSS, so clearing preferences restores the original DOM.

The service worker handles deterministic phrase matches first. Uncertain cards share a preference-aware queue, are batched in groups of up to eight, and are cached by video ID and normalized preferences. Changing the API key replaces the coordinator and clears persisted decisions.

Jev receives only the video ID, title, channel, selected visible metadata and the user's topic lists. It does not receive cookies, account data, transcripts or hidden page state.

Timeouts and malformed responses fail open. While Show only is active, pending cards are concealed briefly to prevent thumbnail flashes; both JavaScript and CSS deadlines restore them if a request stalls.
