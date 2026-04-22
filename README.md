# exam-helper

AI-powered flashcard and study tool.

## Structure

```
exam-helper/
├── web/      # Next.js frontend (deployed on Vercel)
└── server/   # Express backend  (deployed on Coolify)
```

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

See [docs/deployment.md](docs/deployment.md) for production setup.
