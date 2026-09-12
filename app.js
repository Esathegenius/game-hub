import { supabase } from "./supabase.js";

const loginPanel = document.querySelector("#loginPanel");
const gameArea = document.querySelector("#gameArea");
const accountArea = document.querySelector("#accountArea");
const accountEmail = document.querySelector("#accountEmail");
const loginForm = document.querySelector("#loginForm");
const loginMessage = document.querySelector("#loginMessage");
const gamesEl = document.querySelector("#games");
const statusEl = document.querySelector("#status");

async function showSession() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    loginPanel.classList.remove("hidden");
    gameArea.classList.add("hidden");
    accountArea.classList.add("hidden");
    return;
  }

  loginPanel.classList.add("hidden");
  gameArea.classList.remove("hidden");
  accountArea.classList.remove("hidden");
  accountEmail.textContent = session.user.email || "Signed in";
  loginMessage.textContent = "";
  loadGames();
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginMessage.textContent = "Signing in…";

  const { error } = await supabase.auth.signInWithPassword({
    email: document.querySelector("#email").value.trim(),
    password: document.querySelector("#password").value
  });

  if (error) {
    loginMessage.textContent = "Sign-in failed. Check your email and password.";
    return;
  }

  loginForm.reset();
  await showSession();
});

document.querySelector("#logout").addEventListener("click", async () => {
  await supabase.auth.signOut();
  gamesEl.innerHTML = "";
  await showSession();
});

async function loadGames() {
  statusEl.textContent = "Loading games…";
  gamesEl.innerHTML = "";

  const { data, error } = await supabase
    .from("games")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    statusEl.textContent = "Could not load games. Please try again.";
    console.error(error);
    return;
  }

  if (!data.length) {
    statusEl.textContent = "No games uploaded yet.";
    return;
  }

  statusEl.textContent = "";

  const cards = [];
  for (const game of data) {
    let image = "";
    if (game.image_path) {
      const result = await supabase.storage
        .from("game-images")
        .createSignedUrl(game.image_path, 3600);
      if (!result.error) image = result.data.signedUrl;
    }

    const zipResult = await supabase.storage
      .from("game-zips")
      .createSignedUrl(game.zip_path, 3600);

    const zip = zipResult.error ? "" : zipResult.data.signedUrl;

    cards.push(`
      <article class="card">
        ${image ? `<img src="${escapeHtml(image)}" alt="">` : `<div class="card-placeholder"></div>`}
        <div class="card-body">
          <div class="meta">v${escapeHtml(game.version || "1.0.0")}</div>
          <h2>${escapeHtml(game.name)}</h2>
          <p>${escapeHtml(game.description)}</p>
          ${zip ? `<a class="download" href="${escapeHtml(zip)}" download>⬇ Download ZIP</a>` : `<span class="muted">Download unavailable</span>`}
        </div>
      </article>`);
  }

  gamesEl.innerHTML = cards.join("");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

supabase.auth.onAuthStateChange(() => showSession());
showSession();
