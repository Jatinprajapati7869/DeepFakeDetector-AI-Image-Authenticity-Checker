# Contributing to DeepFakeDetector

First off, thank you for considering contributing to DeepFakeDetector! 

This document outlines our unified Developer Experience (DX) toolchain, ensuring that everyone writes clean, tested, and reliable code with minimal friction.

---

## 1. Getting Started

We use a single-command setup pipeline. Make sure you have `Node.js 20+` and `Python 3.12` installed.

```bash
# Clone the repository
git clone https://github.com/Jatinprajapati7869/DeepFakeDetector-AI-Image-Authenticity-Checker.git
cd DeepFakeDetector-AI-Image-Authenticity-Checker

# Install all dependencies and setup Git hooks
npm run setup

# Start the local development servers
npm run dev
```

---

## 2. Code Quality Toolchain

We rely on strict, automated tools to format and lint our code. You never have to argue about style in code reviews—let the tools decide.

- **Frontend**: `Prettier` (formatting) and `ESLint` (linting).
- **Backend**: `Ruff` (lightning fast Python linting and formatting).

You can manually trigger the toolchain on the entire codebase at any time:
```bash
# Run linters and formatters
npm run lint

# Run all test suites
npm run test

# Run EVERYTHING (Lint + Format + Tests)
npm run check
```

> **Pro Tip**: If you are using VS Code, install the `esbenp.prettier-vscode` and `charliermarsh.ruff` extensions. Our `.vscode/settings.json` is already configured to automatically format your files on save!

---

## 3. Pre-Commit Hooks (Husky)

When you attempt to run `git commit`, our **Husky** hooks will automatically intervene:

1. **Lint-Staged**: Only the files you staged will be formatted and linted by Ruff/Prettier. If linting fails, the commit is aborted.
2. **Commitlint**: We enforce [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). 

Your commit messages MUST follow this format:
```
<type>: <short summary>
```
**Allowed Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`.

❌ `git commit -m "fixed the bug"` (Will be blocked)
✅ `git commit -m "fix: resolve path traversal vulnerability in batch route"`

---

## 4. Pull Requests

1. Create a feature branch (`feat/your-feature` or `fix/your-fix`).
2. Make your changes and ensure `npm run check` passes locally.
3. Push to your fork and submit a Pull Request.
4. Our GitHub Actions CI pipeline will automatically run `npm run check` against your PR.
5. Wait for a maintainer to review and merge!
