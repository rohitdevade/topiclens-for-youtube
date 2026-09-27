# Verification record

TopicLens 1.1 uses no backend. Its Manifest V3 service worker calls Jev directly with the user's API key from extension-local storage.

The automated suite exercises representative YouTube DOM fixtures and the Jev HTTP contract using fake responses. It covers existing and newly inserted cards, SPA navigation, nested/recycled cards, Hide precedence, clearing preferences, slow and failed classification, stale replies, deduplication, batching, authentication headers and key validation.

Run `npm.cmd test`, `npm.cmd run typecheck`, and `npm.cmd run build`. A live Chrome pass requires reloading the unpacked extension because version 1.1 changes host permissions from localhost to `https://api.typesafe.ai/*`.
