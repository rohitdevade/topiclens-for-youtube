<p align="center">
  <img src="public/icons/icon128.png" width="96" alt="TopicLens icon">
</p>

<h1 align="center">TopicLens for YouTube</h1>

<p align="center">A quiet, continuous topic filter for YouTube.</p>

<p align="center">
  <a href="https://github.com/rohitdevade/topiclens-for-youtube/actions/workflows/ci.yml"><img src="https://github.com/rohitdevade/topiclens-for-youtube/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-23745c" alt="MIT license"></a>
  <img src="https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4" alt="Chrome Manifest V3">
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6" alt="TypeScript strict">
</p>

TopicLens is a Chrome Manifest V3 extension that filters YouTube continuously—including cards loaded during infinite scrolling and in-page navigation—using two topic lists:

- **Hide** removes related videos.
- **Show only** displays videos related to at least one listed topic.

Hide always wins. Empty fields leave YouTube unchanged. The extension evaluates titles, channels and visible card text; it does not claim to know the full contents of a video.

## Build and load

Install Node.js 22 or newer, then run:

```powershell
git clone https://github.com/rohitdevade/topiclens-for-youtube.git
cd topiclens-for-youtube
npm.cmd ci
npm.cmd run build
```

Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the generated `dist/` directory. After rebuilding, click Reload on the extension and refresh YouTube.

## Why TopicLens

- Filters Home, Search, common grids, Shorts cards and watch-page recommendations where YouTube exposes compatible card markup.
- Reacts to infinite scrolling and YouTube's single-page navigation without a page refresh.
- Understands paraphrases through Jev while resolving obvious matches locally.
- Keeps Hide authoritative when a card matches both lists.
- Prevents unwanted-thumbnail flashes and fails open when classification is slow or unavailable.
- Deletes nothing from YouTube's page; every filtered card can be restored instantly.

## Configure Jev in the extension

1. Open the TopicLens popup.
2. Choose **Jev API settings**. The same page is available through Chrome's extension details page under **Extension options**.
3. Paste your TypeSafe Jev API key and choose **Save and test**.

The key is stored in `chrome.storage.local` in the user's Chrome profile and is read only by TopicLens. The service worker sends it as a Bearer credential directly to `https://api.typesafe.ai/v1/systemone`. No local or hosted TopicLens backend is required. Because this is a backend-free design, anyone with access to the Chrome profile or the extension's developer tools may be able to inspect the key. Websites cannot read extension storage.

Changing or removing the key clears cached classification decisions. Removing the extension removes its local settings.

## How filtering works

- Obvious phrase matches are resolved locally.
- Uncertain cards are sent directly from the extension service worker to Jev in batches of up to eight.
- Requests use the official `jev-1.13.0` System One endpoint contract with Noul questions.
- Decisions are cached by video ID and normalized preferences for seven days. In-flight duplicate requests are combined.
- Cards remain in YouTube's DOM and are hidden reversibly.
- While Show only is active, uncertain new cards are temporarily concealed. A failed or slow request restores them so the page cannot remain blank.
- Mutation observers handle infinite scrolling, changed/recycled cards and YouTube's in-page navigation.

The extension requests only `storage`, access to `https://api.typesafe.ai/*`, and a content script on YouTube. It does not need a YouTube API key, Google login, transcripts, cookies, browsing history or remote scripts.

## Verification

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Automated tests cover Hide precedence, empty restoration, preference changes, added cards, YouTube navigation, recycled cards, timeouts, stale replies, batching, deduplication, Jev request/response parsing, authentication headers and API-key validation.

Manual acceptance:

1. Reload TopicLens in `chrome://extensions` so Chrome grants the new TypeSafe host permission.
2. Open **Jev API settings**, enter a key, and confirm the connected message.
3. Set Show only to `robotics`; unrelated cards should disappear and new cards should filter while scrolling.
4. Set Hide to `AI news` and Show only to `AI`; AI-news cards must remain hidden.
5. Clear both fields; all cards hidden by TopicLens should return.
6. Remove the key and try a new uncertain topic; cards should fail open rather than staying blank.

Official references: [TypeSafe API](https://docs.typesafe.ai/api), [models and limits](https://docs.typesafe.ai/models).

## Project resources

- [Architecture](docs/architecture.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [License](LICENSE)
