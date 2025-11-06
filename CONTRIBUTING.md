# Contributing to atelier

Thank you for your interest in contributing to atelier. This document provides guidelines and information for contributors.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/gen-ai-studio.git`
3. Install dependencies: `pnpm i`
4. Set up environment variables (see README.md)
5. Run the development server: `pnpm dev:all`

## Development Guidelines

### Code Style

- Follow the existing code style and patterns
- Use TypeScript for all new code
- Follow the conventions documented in [`docs/context.md`](docs/context.md)

### Architecture Principles

- **Provider-agnostic**: Keep provider-specific code isolated in `lib/providers/*`
- **Single source of truth**: Use Zustand store for UI state; persistence is a side-effect
- **No cross-tab sync**: App is single-tab focused
- **Server-side security**: Never pass API keys from client; use WorkOS Vault server-side
- **Cache Components**: Use `'use cache'` directive for server functions that fetch cacheable data

### Key Conventions

- **Storage**: All persistence goes through `StorageManager` (write serialization, debouncing)
- **Assets**: Store images/videos in `assets` table; workflows reference via `AssetRef`
- **Nodes**: Each node has exactly ONE input handle and ONE output handle
- **UI Patterns**: Use inline Popover for confirmations (never `alert()` or `confirm()`)

### Testing

- Test your changes locally before submitting
- Ensure the app builds successfully: `pnpm build`
- Check for linting errors: `pnpm lint`

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes following the guidelines above
3. Update documentation if needed (especially `docs/context.md` for architectural changes)
4. Submit a pull request with a clear description of changes
5. Ensure all checks pass

## Questions?

Refer to [`docs/context.md`](docs/context.md) for detailed architecture and conventions. If you have questions, please open an issue.

