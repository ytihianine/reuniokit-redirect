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
const CONTACT = "mission-innovation@finances.gouv.fr";
// Intervalle entre deux sondes automatiques (60 s).
const CHECK_INTERVAL_MS = 60000;
// ===========================================

// NB : tous les textes de la page sont statifs ; en cours de route seules
// les couleurs des pastilles et l'état du bouton changent, jamais le texte.

// Remplacement pour les tests : ?urls=https://a.example,https://b.example
const urlParam = new URLSearchParams(location.search).get("urls");
if (urlParam) {
  CANDIDATES = urlParam.split(",").map((s) => s.trim()).filter(Boolean);
}

const probeListEl = document.getElementById("probe-list");
let rows = [];
let targetUrl = null;
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
function updateRow(li, ok) {
  li._ok = ok;
  li.className = ok ? "ok" : "err";
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
//   ok: true  -> le serveur a répondu avec un statut 200.
//   ok: false -> le serveur n'a pas répondu 200 (ou est inaccessible).
//
// Seule la vérification stricte est utilisée : on ne considère le serveur
// comme accessible que si on peut lire le statut 200. Cette approche
// exige que le serveur cible envoie des en-têtes CORS (Access-Control-
// Allow-Origin: *), ou que la page soit servie depuis la même origine.
//
// Sans ces en-têtes, le navigateur ne peut pas lire le statut dans un
// contexte inter-origine. Le serveur sera alors considéré comme inaccessible
// même s'il répond avec un 200 — c'est un choix délibéré : il vaut mieux
// ne pas rediriger que de rediriger vers une erreur 404 par exemple.
async function probe(url) {
  try {
    const res = await fetchOnce(url, "cors");
    return { ok: res.status === 200 };
  } catch {
    return { ok: false };
  }
}

function syncButton() {
  if (targetUrl) {
    goButton.disabled = false;
    goButton.onclick = () => location.replace(targetUrl);
  } else {
    goButton.disabled = true;
    goButton.onclick = null;
  }
}

async function runProbes() {
  rows = [];
  targetUrl = null;
  goButton.disabled = true;
  goButton.onclick = null;

  // Ignore les adresses qui ne sont pas des URL http(s) absolues.
  const candidates = CANDIDATES.filter((url) => /^https?:\/\//i.test(url));
  if (candidates.length === 0) return;

  // Sondes en parallèle ; c'est le résultat qui compte, pas la vitesse.
  const results = await Promise.all(
    candidates.map(async (url) => {
      const row = addRow(url);
      rows.push(row);
      const result = await probe(url);
      updateRow(row, result.ok);
      return { url, ok: result.ok };
    })
  );

  // La première adresse dont le serveur a répondu avec 200 OK.
  const target = results.find((r) => r.ok);
  if (target) targetUrl = target.url;
  syncButton();
  // Sinon le bouton reste inactif : le visiteur est invité à écrire au contact.
}

async function main() {
  await runProbes();
  // Relance automatique toutes les 60 s (rafraîchit le cache et le ping).
  setInterval(runProbes, CHECK_INTERVAL_MS);
}

main();
