# exam-helper

AI-powered flashcard and study tool — upload your documents, generate flashcards, notes, and study guides using the AI model of your choice.

[![Server image](https://ghcr-badge.egpl.dev/anasyd/exam-helper-server/latest_tag?label=server)](https://github.com/anasyd/exam-helper/pkgs/container/exam-helper-server)
[![Web image](https://ghcr-badge.egpl.dev/anasyd/exam-helper-web/latest_tag?label=web)](https://github.com/anasyd/exam-helper/pkgs/container/exam-helper-web)

## Structure

```
exam-helper/
├── web/      # Next.js frontend  — ghcr.io/anasyd/exam-helper-web
└── server/   # Express backend   — ghcr.io/anasyd/exam-helper-server
```

## Self-hosting

See **[docs/self-hosting.md](docs/self-hosting.md)** for the full Coolify deployment guide — including auto-generated secrets and one-compose setup.

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

## Releasing a new version

```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions builds both Docker images and pushes them to GHCR automatically.
Tags `latest`, `1`, `1.0`, and `1.0.0` are all published.
