# Ball Run Download — Chat Update

This update adds a login-protected class chat to the existing Game Hub.

## 1. Supabase
Open Supabase → SQL Editor and run `chat-setup.sql` once.

The chat only allows authenticated users to read and send messages. Messages are limited to 500 characters.

## 2. GitHub
Replace these three files in your existing `Esathegenius/game-hub` repository:
- `index.html`
- `app.js`
- `style.css`

Do NOT replace `supabase.js` because it contains your real Supabase project URL and publishable key.

Keep your existing `admin.html` and `admin.js`.

## 3. How chat works
The page checks for a Supabase login first. Once logged in, the chat appears below the game downloads. New messages are checked about every 2.5 seconds, so classmates can chat without manually refreshing.
