# reuniokit-redirect

A simple static site (one HTML file plus a small CSS and JS file) that checks two candidate URLs **from the visitor's browser** and redirects them to the one that is available.

## How it works

1. On load, the page probes both candidate URLs in parallel (6 s timeout each).
2. The redirect is **not automatic**: once the probes finish, if a candidate answers with an actual **200 OK**, a button appears and the visitor clicks it to be redirected (`location.replace`, so the redirect page doesn't stay in browser history). If both return 200, the first one in the list wins.
3. If the browser can't read the status (CORS), it falls back to an opaque request: a host that answers *at all* becomes the button's last-resort target, marked "répondu (statut masqué)" in the UI.
4. If nothing responds, the page shows both URLs as manual links.

## Local testing

Run the command `npx serve .` and open the page in your browser.

## Configuration

Edit the top of [`app.js`](app.js):

```js
const CANDIDATES = [
  "https://primary.example.com",
  "https://fallback.example.com",
];
const TIMEOUT_MS = 6000;
```

For quick testing you can also override the list via query string:

```
index.html?urls=https://a.example,https://b.example
```

## Deploy

It's three small files with no dependencies — host the whole folder on any static host (GitHub Pages, Netlify, S3, a reverse proxy, …).

## Note on status detection

Browsers hide response status for cross-origin requests without CORS headers. Strict 200 detection works when:

- the page is served from the **same origin** as a candidate, or
- the candidate sends `Access-Control-Allow-Origin: *` (most static hosts — GitHub Pages, S3, Nginx with static config — do this by default; plain Node/Express apps do not unless you add the header).

Otherwise the page still redirects based on "host answered" as a fallback, which covers the common "server is down vs. up" case.
