# 🎮 Game Hub

A small game-download website with a real admin login.

## Stack

- HTML/CSS/JavaScript
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Can be hosted on GitHub Pages, Netlify, Cloudflare Pages, etc.

## Setup

1. Create a Supabase project.
2. Open SQL Editor and run `supabase.sql`.
3. Create your admin account under Authentication > Users.
4. Copy that user's UUID.
5. Run the `insert into public.admins...` command at the bottom of `supabase.sql` using your UUID.
6. Open Project Settings > API and copy the Project URL and anon/public key.
7. Put those two values into `supabase.js`.
8. Host this folder as a static website.

Open `admin.html` to sign in and upload games.

## Security

The public site can only read the game catalogue and download files.
Database and Storage policies prevent non-admin authenticated users from uploading/deleting games.

Never put a Supabase service-role/secret key in the frontend.
