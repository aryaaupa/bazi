# Bazi Website

Marketing website for Bazi, the adaptive intelligence layer for software-based medicine.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Checks

```bash
npm run lint
npm run build
```

## Publish with GitHub Pages

1. Create a new GitHub repository.
2. Upload every file in this project to the repository.
3. In GitHub, open **Settings → Pages**.
4. Under **Build and deployment**, choose **GitHub Actions**.
5. Push to the `main` branch. The included workflow builds and publishes the site automatically.

For a project repository, the URL will usually be `https://YOUR-USERNAME.github.io/REPOSITORY-NAME/`. For a repository named `YOUR-USERNAME.github.io`, it will publish at the root domain.

## Form behavior

The early access form currently stores entries only in the visitor's browser using `localStorage`. It does not email or upload submissions. Replace the marked block in `components/early-access-form.tsx` with a real API or form service before collecting real leads.

## Production domain

Update the canonical URLs in `app/layout.tsx`, `app/robots.ts`, and `app/sitemap.ts` when the final domain is known.
