# reuniokit-redirect

A simple static site (one HTML file plus a small CSS and JS file) that checks two candidate URLs **from the visitor's browser** and lets them reach the one that is available.

## How it works

1. On load, the page probes both candidate URLs in parallel (6 s timeout each).
2. All page texts are **static** — nothing changes with the probe results. Status is shown by the colored dot next to each URL: blue (pulsing) = checking, green = the host answered, red = failed.
3. The redirect is **not automatic**: the button stays disabled until a candidate is available, then it becomes clickable. Clicking it redirects the visitor (`location.replace`, so the redirect page doesn't stay in browser history). If both return 200, the first one in the list wins.
4. If the browser can't read the status (CORS), it falls back to an opaque request: a host that answers *at all* is treated as available.
5. If nothing responds, the button remains disabled and the contact line at the bottom tells the visitor who to reach out to (`CONTACT` in `app.js`).

## Configuration

Edit the top of [`app.js`](app.js):

```js
const CANDIDATES = [
  "https://primary.example.com",
  "https://fallback.example.com",
];
const TIMEOUT_MS = 6000;
const CONTACT = "support@exemple.com";
```

For quick testing you can also override the URL list via query string:

```
/?urls=https://a.example,https://b.example
```

## Deploy

It's three small files with no dependencies — host the whole folder on any static host (GitHub Pages, Netlify, S3, a reverse proxy, …).

## Note on status detection

Browsers hide response status for cross-origin requests without CORS headers. Strict 200 detection works when:

- the page is served from the **same origin** as a candidate, or
- the candidate sends `Access-Control-Allow-Origin: *` (most static hosts — GitHub Pages, S3, Nginx with static config — do this by default; plain Node/Express apps do not unless you add the header).

Otherwise the page still treats "host answered" as available, which covers the common "server is down vs. up" case.
