# File Uploader

A small cloud-storage app. Sign up, create folders, upload files into them, and share a folder with anyone through a link that expires.

**Live demo:** https://file-uploader-oycx.onrender.com

> The demo runs on Render's free tier, which sleeps after about 15 minutes without traffic. The first visit after that can take up to a minute to load.

## Features

- **Accounts:** sign up and log in with a username and password. Passwords are hashed with bcrypt, and sessions are stored in Postgres, so a server restart doesn't log anyone out.
- **Folders:** create, rename and delete folders. Folder names are unique per user. Deleting a folder also deletes its files.
- **Files:** upload one file at a time into a folder (up to 10 MB). Allowed types are images (JPEG, PNG, GIF, WebP), PDF, plain text, ZIP and Word documents. Each file has a details page showing its name, size, type and upload time. Downloads keep the original filename.
- **Sharing:** create a public, read-only link to a folder that expires after a set time, such as `12h` or `7d` (30 days at most). Anyone with the link can view and download the folder's files without an account. You can revoke a link at any time.

## Tech stack

- **Server:** Node.js, Express 5, EJS templates
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** Passport (local strategy), express-session, `@quixo3/prisma-session-store`
- **Uploads:** Multer (in-memory) streaming to Cloudinary
- **Validation:** express-validator

## Running locally

You need Node.js 20 or newer, a PostgreSQL database and a free [Cloudinary](https://cloudinary.com) account.

1. Clone the repo and install dependencies:

   ```bash
   git clone https://github.com/Jashan-Khandelwal/file-uploader.git
   cd file-uploader
   npm install
   ```

2. Create a `.env` file in the project root:

   ```env
   DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/file_uploader"
   SESSION_SECRET="any-long-random-string"
   CLOUDINARY_URL="cloudinary://API_KEY:API_SECRET@CLOUD_NAME"
   ```

   | Variable | Required | Purpose |
   |---|---|---|
   | `DATABASE_URL` | Yes | PostgreSQL connection string |
   | `SESSION_SECRET` | Yes | Signs the session cookie |
   | `CLOUDINARY_URL` | Yes | Cloudinary credentials, found on your Cloudinary dashboard |
   | `PORT` | No | Port to listen on (default `3000`) |
   | `NODE_ENV` | No | Set to `production` to hide error details from users |

3. Create the database tables:

   ```bash
   npx prisma migrate dev
   ```

4. Start the server. It restarts automatically when files change:

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

## Deploying

The live demo runs on [Render](https://render.com), with the database on [Neon](https://neon.com).

- **Build command:** `npm install --include=dev && npx prisma generate && npx prisma migrate deploy`
- **Start command:** `npm start`
- **Environment variables:** `DATABASE_URL`, `SESSION_SECRET`, `CLOUDINARY_URL` and `NODE_ENV=production`. Render sets `PORT` itself.

The build command needs `--include=dev` because `prisma` is a dev dependency, and npm skips dev dependencies when `NODE_ENV=production`. `prisma migrate deploy` applies any new migrations on each deploy. For Neon, use the direct (non-pooled) connection string so migrations run reliably.

## Project structure

```
app.js            Express setup: sessions, Passport, routes, error handling
config/           Passport strategy and Multer upload rules
controllers/      Request handlers for auth, folders, files and shares
db/prisma.js      Shared Prisma client
middleware/       Login guard and upload error handling
prisma/           Schema and migrations
routes/           URL definitions
storage/index.js  The only module that talks to Cloudinary
views/            EJS templates
```

## Design notes

- **One storage module.** Everything that touches Cloudinary is in `storage/index.js` (save, download URL, delete). Files started out on local disk, and switching to Cloudinary meant rewriting only that file.
- **Ownership checks in every query.** Folder and file lookups filter by both `id` and the logged-in user's id. Changing the id in the URL can't open someone else's folder or file. You get a 404 instead.
- **Upload checks happen before the file is accepted.** The app confirms you own the folder before Multer reads the upload.
- **Share links can't reach other folders.** A share link's ID is a random UUID. A shared download is allowed only if the file belongs to the shared folder, so a valid link can't be used to fetch other files by guessing their ids. Expired and unknown links show the same message.
