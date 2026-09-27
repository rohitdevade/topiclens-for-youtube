# Security policy

## Reporting a vulnerability

Please do not open a public issue for a vulnerability involving API-key exposure or arbitrary network access. Use GitHub's private vulnerability reporting for this repository instead.

Include the affected version, impact, reproduction steps and any suggested mitigation. You should receive an acknowledgement within seven days.

## API-key model

TopicLens is intentionally backend-free. A user's Jev API key is stored in `chrome.storage.local` and sent only to `https://api.typesafe.ai`. Websites cannot read extension storage, but someone with access to the Chrome profile or extension developer tools may be able to inspect the key. Users should create a dedicated key, rotate it if the profile is shared or compromised, and remove it from TopicLens when it is no longer needed.

Never include a real key in issues, screenshots, logs, commits or test fixtures.
