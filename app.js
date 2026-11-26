"use strict";

// ============== CONFIGURATION ==============
// The two candidate URLs, tried in this order (first wins on a tie).
const CANDIDATES = [
  "https://reuniokit.lab.sspcloud.fr/",
  "https://fallback.example.com",
];
// How long to wait for each candidate before giving up.
const TIMEOUT_MS = 6000;
// ===========================================

// Optional override for testing: ?urls=https://a.example,https://b.example
const urlParam = new URLSearchParams(location.search).get("urls");
if (urlParam) {
  CANDIDATES = urlParam.split(",").map((s) => s.trim()).filter(Boolean);
}

const loadingEl = document.getElementById("loading");
const errorEl = document.getElementById("error");
const probeListEl = document.getElementById("probe-list");
const fallbackListEl = document.getElementById("fallback-list");
const spinnerEl = document.getElementById("spinner");
const headlineEl = document.getElementById("headline");
const subtitleEl = document.getElementById("subtitle");
const ctaEl = document.getElementById("cta");
const goButton = document.getElementById("go-button");

function addRow(url) {
  const li = document.createElement("li");
  li.className = "pending";

  const dot = document.createElement("span");
  dot.className = "dot";

  const code = document.createElement("code");
  code.textContent = url;

  const state = document.createElement("span");
  state.className = "state";
  state.textContent = "vérification…";

  li.append(dot, code, state);
  probeListEl.appendChild(li);
  return li;
}

function updateRow(li, result) {
  li.className = result.ok ? "ok" : "err";
  const state = li.querySelector(".state");
  if (result.confirmed) state.textContent = "200 OK";
  else if (result.ok) state.textContent = "répondu (statut masqué)";
  else state.textContent = result.error || "échec";
}

function withTimeout(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
}

async function fetchOnce(url, mode) {
  const t = withTimeout(TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: "GET",
      mode,
      cache: "no-store",
      redirect: "follow",
      signal: t.signal,
    });
  } finally {
    t.done();
  }
}

// Probe one candidate.
//   confirmed: true  -> we saw an actual "200 OK" status
//   ok: true         -> the host answered (but the browser hid the status)
async function probe(url) {
  // Strict check: works if the page is served from the same origin as the
  // candidate, or if the candidate sends CORS headers (most static hosts
  // send Access-Control-Allow-Origin: * by default).
  try {
    const res = await fetchOnce(url, "cors");
    if (res.status === 200) return { ok: true, confirmed: true };
    return { ok: false, error: "HTTP " + res.status };
  } catch {
    // CORS-blocked or network error: retry opaquely. The browser still
    // resolves the request when the host sends *any* HTTP response, so at
    // least we learn whether the host is up.
    try {
      await fetchOnce(url, "no-cors");
      return { ok: true, confirmed: false };
    } catch {
      return { ok: false, error: "inaccessible" };
    }
  }
}

function redirect(url) {
  document.title = "Redirection vers " + url;
  location.replace(url);
}

// La redirection n'est jamais automatique : on affiche un bouton
// que l'utilisateur doit cliquer pour continuer.
function showGoButton(url) {
  spinnerEl.classList.add("hidden");
  headlineEl.textContent = "Redirection disponible";
  subtitleEl.textContent = "L'adresse suivante est accessible.";
  ctaEl.textContent =
    "Cliquez sur le bouton pour être redirigé vers le site fonctionnel.";
  goButton.textContent = url;
  goButton.onclick = () => redirect(url);
  ctaEl.classList.remove("hidden");
  goButton.classList.remove("hidden");
}

function showError() {
  loadingEl.classList.add("hidden");
  errorEl.classList.remove("hidden");
  document.title = "Échec de la redirection";
  for (const url of CANDIDATES) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = url;
    a.textContent = url;
    li.appendChild(a);
    fallbackListEl.appendChild(li);
  }
}

async function main() {
  // Ignore candidates that are not absolute http(s) URLs.
  const candidates = CANDIDATES.filter((url) => /^https?:\/\//i.test(url));
  if (candidates.length === 0) return showError();

  // Probe in parallel; resolution is what matters, not which finishes first.
  const results = await Promise.all(
    candidates.map(async (url) => {
      const row = addRow(url);
      const result = await probe(url);
      updateRow(row, result);
      return { url, ...result };
    })
  );

  // 1) Prefer a confirmed 200 OK, in list order (first wins).
  const confirmed = results.find((r) => r.confirmed);
  if (confirmed) return showGoButton(confirmed.url);

  // 2) Fallback: the first candidate whose host answered at all.
  const answered = results.find((r) => r.ok);
  if (answered) return showGoButton(answered.url);

  // 3) Nothing worked — let the user try manually.
  showError();
}

main();
