# Contributing

Thanks for helping improve TopicLens.

## Development

```bash
npm ci
npm run typecheck
npm test
npm run build
```

Load `dist/` as an unpacked extension from `chrome://extensions`. After each rebuild, reload the extension and refresh YouTube.

## Pull requests

- Keep the popup focused on Hide and Show only; API credentials belong on the Options page.
- Preserve fail-open behavior when Jev is unavailable.
- Never add a real Jev key or captured private YouTube data to fixtures.
- Add focused tests for filtering, cache, selector or API-contract changes.
- Explain observable behavior and manual validation in the pull request.

YouTube changes its DOM regularly. Selector fixes should include a minimal representative fixture rather than a copy of a signed-in page.
