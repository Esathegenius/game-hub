import { supabase } from "./supabase.js";

const loginPanel = document.querySelector("#loginPanel");
const dashboard = document.querySelector("#dashboard");
const loginForm = document.querySelector("#loginForm");
const loginMessage = document.querySelector("#loginMessage");
const gameForm = document.querySelector("#gameForm");
const uploadMessage = document.querySelector("#uploadMessage");
const adminGames = document.querySelector("#adminGames");

async function isAdmin(userId) {
  const { data, error } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return !error && !!data;
}

async function showSession() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    loginPanel.classList.remove("hidden");
    dashboard.classList.add("hidden");
    return;
  }

  if (!(await isAdmin(session.user.id))) {
    await supabase.auth.signOut();
    loginPanel.classList.remove("hidden");
    dashboard.classList.add("hidden");
    loginMessage.textContent = "This account is not an admin.";
    return;
  }

  loginPanel.classList.add("hidden");
  dashboard.classList.remove("hidden");
  loadAdminGames();
}

loginForm.addEventListener("submit", async e => {
  e.preventDefault();
  loginMessage.textContent = "Signing in…";

  const { error } = await supabase.auth.signInWithPassword({
    email: document.querySelector("#email").value,
    password: document.querySelector("#password").value
  });

  if (error) loginMessage.textContent = error.message;
  else await showSession();
});

document.querySelector("#logout").addEventListener("click", async () => {
  await supabase.auth.signOut();
  await showSession();
});

gameForm.addEventListener("submit", async e => {
  e.preventDefault();
  uploadMessage.textContent = "Uploading…";

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdmin(user.id))) {
    uploadMessage.textContent = "Admin access required.";
    return;
  }

  const name = document.querySelector("#name").value.trim();
  const description = document.querySelector("#description").value.trim();
  const version = document.querySelector("#version").value.trim() || "1.0.0";
  const zipFile = document.querySelector("#zip").files[0];
  const imageFile = document.querySelector("#image").files[0];

  if (!zipFile || !zipFile.name.toLowerCase().endsWith(".zip")) {
    uploadMessage.textContent = "Please choose a .ZIP file.";
    return;
  }

  const safeBase = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const id = crypto.randomUUID();
  const zipPath = `${id}/${safeBase || "game"}.zip`;

  const zipUpload = await supabase.storage.from("game-zips").upload(zipPath, zipFile, {
    contentType: "application/zip",
    upsert: false
  });

  if (zipUpload.error) {
    uploadMessage.textContent = zipUpload.error.message;
    return;
  }

  let imagePath = null;
  if (imageFile) {
    const ext = imageFile.name.split(".").pop().toLowerCase();
    imagePath = `${id}/thumbnail.${ext}`;
    const imageUpload = await supabase.storage.from("game-images").upload(imagePath, imageFile, {
      contentType: imageFile.type,
      upsert: false
    });

    if (imageUpload.error) {
      await supabase.storage.from("game-zips").remove([zipPath]);
      uploadMessage.textContent = imageUpload.error.message;
      return;
    }
  }

  const { error } = await supabase.from("games").insert({
    id, name, description, version, zip_path: zipPath, image_path: imagePath, created_by: user.id
  });

  if (error) {
    await supabase.storage.from("game-zips").remove([zipPath]);
    if (imagePath) await supabase.storage.from("game-images").remove([imagePath]);
    uploadMessage.textContent = error.message;
    return;
  }

  gameForm.reset();
  document.querySelector("#version").value = "1.0.0";
  uploadMessage.textContent = "Game uploaded!";
  loadAdminGames();
});

async function loadAdminGames() {
  const { data, error } = await supabase.from("games").select("id,name,version,created_at").order("created_at", { ascending: false });
  if (error) {
    adminGames.textContent = error.message;
    return;
  }

  adminGames.innerHTML = data.map(game => `
    <div class="admin-row">
      <span><strong>${escapeHtml(game.name)}</strong> <span class="muted">v${escapeHtml(game.version)}</span></span>
      <button class="danger" data-id="${game.id}">Delete</button>
    </div>
  `).join("");

  adminGames.querySelectorAll("[data-id]").forEach(button => {
    button.addEventListener("click", () => deleteGame(button.dataset.id));
  });
}

async function deleteGame(id) {
  if (!confirm("Delete this game?")) return;

  const { data: game, error: getError } = await supabase.from("games").select("zip_path,image_path").eq("id", id).single();
  if (getError) return alert(getError.message);

  const { error } = await supabase.from("games").delete().eq("id", id);
  if (error) return alert(error.message);

  if (game.zip_path) await supabase.storage.from("game-zips").remove([game.zip_path]);
  if (game.image_path) await supabase.storage.from("game-images").remove([game.image_path]);

  loadAdminGames();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

supabase.auth.onAuthStateChange(() => showSession());
showSession();
