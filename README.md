<div align="center">
  <img src="docs/assets/hero-dark.png" alt="exam-helper" width="100%"/>
</div>

<br/>

<div align="center">
  <strong>AI-powered flashcards and study guides from your own documents.</strong><br/>
  Upload a PDF or DOCX, pick your AI model, and get flashcards, notes, and study guides in seconds.
</div>

<br/>

<div align="center">

[![Server image](https://ghcr-badge.egpl.dev/anasyd/exam-helper-server/latest_tag?label=server%20image&color=%23b8854a)](https://github.com/anasyd/exam-helper/pkgs/container/exam-helper-server)
[![Web image](https://ghcr-badge.egpl.dev/anasyd/exam-helper-web/latest_tag?label=web%20image&color=%23b8854a)](https://github.com/anasyd/exam-helper/pkgs/container/exam-helper-web)
[![License: MIT](https://img.shields.io/badge/license-MIT-b8854a?style=flat)](LICENSE)

</div>

---

## Screenshots

| Dark | Light |
|------|-------|
| ![Dark mode](docs/assets/hero-dark.png) | ![Light mode](docs/assets/hero-light.png) |

<details>
<summary>Sign-in page</summary>
<br/>
<img src="docs/assets/sign-in.png" alt="Sign-in page" width="100%"/>
</details>

---

## Features

- **Bring your own AI** — Gemini, OpenAI, Claude, OpenRouter. Configure once, swap per feature.
- **Vision-aware** — flagship models read PDFs directly; diagrams, equations, and scanned pages stay intact.
- **Spaced repetition** — cards you struggle with surface more often; mastered cards fade out.
- **Runs in your browser** — your documents and API keys stay on your device. No account required to start.
- **Auth built in** — email/password + Google OAuth, password reset, email verification.
- **Self-hostable** — single Docker Compose file, deploys to [Coolify](https://coolify.io) in minutes.

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, Tailwind CSS, shadcn/ui |
| Backend | Express 4, TypeScript, Better Auth |
| Database | MongoDB (Atlas or self-hosted) |
| Email | Resend |
| Auth | Better Auth (email/pw + Google OAuth) |
| Containers | Docker, GHCR |

---

## Monorepo structure

```
exam-helper/
├── web/      # Next.js frontend   — ghcr.io/anasyd/exam-helper-web
└── server/   # Express backend    — ghcr.io/anasyd/exam-helper-server
```

---

## Self-hosting

See **[docs/self-hosting.md](docs/self-hosting.md)** for the full Coolify deployment guide — auto-generated secrets, one-compose setup, smoke-test checklist.

---

## Local development

**Backend**
```bash
cd server
cp .env.example .env   # fill in values
npm install
npm run dev            # http://localhost:4000
```

**Frontend**
```bash
cd web
echo "NEXT_PUBLIC_AUTH_URL=http://localhost:4000" > .env.local
npm install
npm run dev            # http://localhost:3000
```

---

## Releasing

```bash
git tag v1.2.3
git push origin v1.2.3
```

GitHub Actions builds both Docker images and pushes to GHCR with tags `latest`, `1`, `1.2`, and `1.2.3`.
