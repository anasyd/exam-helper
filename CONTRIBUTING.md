# Contributing to exam-helper

Thanks for your interest in contributing! Here's how to get started.

## Before You Start

By contributing, you agree that your contributions will be licensed under the same license as this project (AGPL-3.0 + Commons Clause). You also confirm that you have the right to submit the work.

## How to Contribute

**Reporting bugs** — open an issue with a clear title, steps to reproduce, expected vs actual behavior, and your environment (OS, browser, Docker version).

**Suggesting features** — open an issue describing the feature and the problem it solves. Check existing issues first to avoid duplicates.

**Submitting code** — follow the steps below.

## Development Setup

```bash
# Backend
cd server
cp .env.example .env
npm install
npm run dev   # http://localhost:4000

# Frontend
cd web
cp .env.example .env.local
npm install
npm run dev   # http://localhost:3000
```

## Pull Request Process

1. Fork the repo and create a branch from `main`
2. Make your changes — keep the scope focused
3. Test your changes locally before submitting
4. Open a PR with a clear description of what changed and why
5. PRs are reviewed by the maintainer — expect feedback within a few days

## Style Guidelines

- TypeScript everywhere — no `any` unless unavoidable
- Keep components small and focused
- No commented-out code in PRs
- Match the existing code style

## Questions?

Open an issue or email **security@examhelper.app**.
