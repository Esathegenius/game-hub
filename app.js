import { supabase } from "./supabase.js";

const loginPanel = document.querySelector("#loginPanel");
const gameArea = document.querySelector("#gameArea");
const accountArea = document.querySelector("#accountArea");
const accountEmail = document.querySelector("#accountEmail");
const loginForm = document.querySelector("#loginForm");
const loginMessage = document.querySelector("#loginMessage");
const gamesEl = document.querySelector("#games");
const statusEl = document.querySelector("#status");
const messagesEl = document.querySelector("#messages");
const chatForm = document.querySelector("#chatForm");
const messageInput = document.querySelector("#messageInput");
const chatStatus = document.querySelector("#chatStatus");

let currentUser = null;
let chatTimer = null;
let lastMessageSignature = "";

async function showSession() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    currentUser = null;
    loginPanel.classList.remove("hidden");
    gameArea.classList.add("hidden");
    accountArea.classList.add("hidden");
    stopChatPolling();
    return;
  }

  currentUser = session.user;
  loginPanel.classList.add("hidden");
  gameArea.classList.remove("hidden");
  accountArea.classList.remove("hidden");
  accountEmail.textContent = session.user.email || "Signed in";
  loginMessage.textContent = "";
  loadGames();
  startChatPolling();
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
  stopChatPolling();
  await supabase.auth.signOut();
  gamesEl.innerHTML = "";
  messagesEl.innerHTML = "";
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

async function loadMessages() {
  if (!currentUser) return;

  const { data, error } = await supabase
    .from("messages")
    .select("id, user_id, sender_email, content, created_at")
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    chatStatus.textContent = "Chat unavailable";
    console.error(error);
    return;
  }

  chatStatus.textContent = "Online";

  const signature = data.map(m => `${m.id}:${m.content}:${m.created_at}`).join("|");
  if (signature === lastMessageSignature) return;
  lastMessageSignature = signature;

  messagesEl.innerHTML = data.map(message => {
    const mine = message.user_id === currentUser.id;
    const sender = mine ? "You" : (message.sender_email || "Classmate");
    const time = new Date(message.created_at).toLocaleString([], {
      hour: "numeric", minute: "2-digit"
    });
    return `
      <article class="message-bubble ${mine ? "mine" : ""}">
        <div class="message-meta"><strong>${sender}</strong><span>${time}</span></div>
        <div class="message-content">${escapeHtml(message.content)}</div>
      </article>`;
  }).join("");

  messagesEl.scrollTop = messagesEl.scrollHeight;
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  const content = messageInput.value.trim();
  if (!content) return;

  messageInput.disabled = true;
  chatStatus.textContent = "Sending…";

  const { error } = await supabase.from("messages").insert({
    user_id: currentUser.id,
    content
  });

  messageInput.disabled = false;

  if (error) {
    chatStatus.textContent = "Could not send";
    console.error(error);
    return;
  }

  messageInput.value = "";
  lastMessageSignature = "";
  await loadMessages();
  messageInput.focus();
});

function startChatPolling() {
  stopChatPolling();
  lastMessageSignature = "";
  loadMessages();
  chatTimer = setInterval(loadMessages, 2500);
}

function stopChatPolling() {
  if (chatTimer) clearInterval(chatTimer);
  chatTimer = null;
  lastMessageSignature = "";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "'":"&#039;"
  }[c]));
}

supabase.auth.onAuthStateChange(() => showSession());
showSession();
