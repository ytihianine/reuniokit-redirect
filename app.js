"use strict";

// ============== CONFIGURATION ==============
// Les deux URL candidates, dans cet ordre (la première l'emporte en cas d'égalité).
const CANDIDATES = [
  "https://reuniokit.lab.sspcloud.fr/",
  "https://reuniokit.lab.incubateur.finances.rie.gouv.fr/",
];
// Délai d'attente pour chaque adresse avant d'abandonner.
const TIMEOUT_MS = 6000;
// Contact à indiquer si aucun site ne fonctionne.
const CONTACT = "support@exemple.com";
// ===========================================

// NB : tous les textes de la page sont statifs ; en cours de route seules
// les couleurs des pastilles et l'état du bouton changent, jamais le texte.

// Remplacement pour les tests : ?urls=https://a.example,https://b.example
const urlParam = new URLSearchParams(location.search).get("urls");
if (urlParam) {
  CANDIDATES = urlParam.split(",").map((s) => s.trim()).filter(Boolean);
}

const probeListEl = document.getElementById("probe-list");
const goButton = document.getElementById("go-button");
const contactLink = document.getElementById("contact-link");

// Lien de contact, renseigné une seule fois au chargement.
contactLink.href = "mailto:" + CONTACT;
contactLink.textContent = CONTACT;

function addRow(url) {
  const li = document.createElement("li");
  li.className = "pending";

  const dot = document.createElement("span");
  dot.className = "dot";

  const link = document.createElement("a");
  link.href = url;
  link.textContent = url;

  li.append(dot, link);
  probeListEl.appendChild(li);
  return li;
}

// Seule la classe de la ligne (donc la couleur du point) change — jamais le texte.
function updateRow(li, result) {
  li.className = result.ok ? "ok" : "err";
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

// Sonde une adresse.
//   confirmed: true  -> on a vu un vrai statut "200 OK"
//   ok: true         -> le serveur a répondu (mais le navigateur a masqué le statut)
async function probe(url) {
  // Vérification stricte : fonctionne si la page est servie depuis la même
  // origine que l'adresse, ou si l'adresse envoie des en-têtes CORS (la
  // plupart des hébergements statiques envoient Access-Control-Allow-Origin: *).
  try {
    const res = await fetchOnce(url, "cors");
    if (res.status === 200) return { ok: true, confirmed: true };
    return { ok: false, error: "HTTP " + res.status };
  } catch {
    // Bloqué par CORS ou erreur réseau : nouvelle tentative opaque. Le
    // navigateur résout la requête dès que le serveur envoie une réponse,
    // ce qui permet au moins de savoir si le serveur est en ligne.
    try {
      await fetchOnce(url, "no-cors");
      return { ok: true, confirmed: false };
    } catch {
      return { ok: false, error: "inaccessible" };
    }
  }
}

// Active le bouton uniquement si une adresse est disponible.
function enableButton(url) {
  goButton.disabled = false;
  goButton.onclick = () => location.replace(url);
}

async function main() {
  // Ignore les adresses qui ne sont pas des URL http(s) absolues.
  const candidates = CANDIDATES.filter((url) => /^https?:\/\//i.test(url));
  if (candidates.length === 0) return; // le bouton reste inactif

  // Sondes en parallèle ; c'est le résultat qui compte, pas la vitesse.
  const results = await Promise.all(
    candidates.map(async (url) => {
      const row = addRow(url);
      const result = await probe(url);
      updateRow(row, result);
      return { url, ...result };
    })
  );

  // 1) De préférence un 200 OK confirmé, dans l'ordre de la liste.
  const confirmed = results.find((r) => r.confirmed);
  // 2) À défaut, la première adresse dont le serveur a répondu.
  const target = confirmed || results.find((r) => r.ok);
  if (target) enableButton(target.url);
  // Sinon le bouton reste inactif : le visiteur est invité à écrire au contact.
}

main();
