# reuniokit-redirect

A simple static site (one HTML file plus a small CSS and JS file) that checks two candidate URLs **from the visitor's browser** and lets them reach the one that is available.

## How it works

1. On load, the page probes both candidate URLs in parallel (6 s timeout each).
2. All page texts are **static** — nothing changes with the probe results. Status is shown by the colored dot next to each URL: blue (pulsing) = checking, green = 200 OK, red = failed or non-200.
3. Only an actual **200 OK** status is accepted. A site returning 404, 500, or any other code is treated as inaccessible — even if the host is up and responding.
4. The redirect is **not automatic**: the button stays disabled until a candidate returns 200 OK, then it becomes clickable. Clicking it redirects the visitor (`location.replace`, so the redirect page doesn't stay in browser history). If both return 200, the first one in the list wins.
5. If nothing responds with 200 OK, the button remains disabled and the contact line at the bottom tells the visitor who to reach out to (`CONTACT` in `app.js`).

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

The page uses `fetch` with `mode: "cors"` to read the HTTP status. This means:

- The page must be served from the **same origin** as a candidate, **or**
- The candidate must send `Access-Control-Allow-Origin: *` (most static hosts — GitHub Pages, S3, Nginx with static config — do this by default; plain Node/Express apps do not unless you add the header).

If CORS headers are missing, the status is unreadable and the site is treated as inaccessible (even if it responds with 200). This is intentional: it prevents accidental redirects to a site that returns 404 but has the right host up.
