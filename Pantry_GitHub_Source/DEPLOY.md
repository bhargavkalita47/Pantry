# Publish Pantry

## Fastest: Netlify Drop

Open https://app.netlify.com/drop and drag the prepared Pantry_Netlify_Drop folder onto the upload area. Share the generated URL. No backend setup is required for this browser-local demo.

## GitHub source

Create a new repository named pantry-inventory at https://github.com/new.

You can upload the contents of Pantry_GitHub_Source through GitHub's Add file > Upload files, or use these commands inside that clean source folder:

~~~powershell
git init
git add .
git commit -m "Build Pantry inventory demo"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/pantry-inventory.git
git push -u origin main
~~~

Replace YOUR_USERNAME. Do not upload .env files, .pantry-local, node_modules or any other project's data.

## Netlify from Git

Add new project > Import an existing project > GitHub > select pantry-inventory.

Build command: npm run build
Publish directory: dist
Node: 24
No environment variables are needed for demo mode.

## Vercel from Git

Add New > Project > import pantry-inventory.

Framework preset: Other
Build command: npm run build
Output directory: dist
Node: 24
No environment variables are needed for demo mode.

## Backend later

See README.md and database/supabase-setup.sql for the optional password-protected server-backed workspace.

## If the demo shows a loading error

- Upload the built folder itself, containing index.html, pantry.js, storage.mjs, demo-store.mjs and domain.mjs.
- Do not upload only app.html.
- Open the deployed HTTPS address; opening index.html as a file:// URL does not support JavaScript modules correctly.
- Leave all four cloud variables unset for browser demo mode.
