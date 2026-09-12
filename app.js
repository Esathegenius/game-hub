import { supabase } from "./supabase.js";

const gamesEl = document.querySelector("#games");
const statusEl = document.querySelector("#status");

async function loadGames() {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    statusEl.textContent = "Could not load games. Check your Supabase setup.";
    console.error(error);
    return;
  }

  statusEl.textContent = data.length ? "" : "No games uploaded yet.";
  gamesEl.innerHTML = data.map(game => {
    const image = game.image_path
      ? supabase.storage.from("game-images").getPublicUrl(game.image_path).data.publicUrl
      : "";
    const zip = supabase.storage.from("game-zips").getPublicUrl(game.zip_path).data.publicUrl;

    return `
      <article class="card">
        ${image ? `<img src="${escapeHtml(image)}" alt="">` : `<div style="height:160px;background:#1a2440"></div>`}
        <div class="card-body">
          <div class="meta">v${escapeHtml(game.version || "1.0.0")}</div>
          <h2>${escapeHtml(game.name)}</h2>
          <p>${escapeHtml(game.description)}</p>
          <a class="download" href="${escapeHtml(zip)}" download>⬇ Download ZIP</a>
        </div>
      </article>`;
  }).join("");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

loadGames();
