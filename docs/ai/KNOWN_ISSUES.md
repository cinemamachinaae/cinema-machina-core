# Cinema Machina Core — Known Issues

Track bugs, blockers, and technical debt here.

## Open issues
- Jellyfin session fetching/parsing is not implemented yet (`JellyfinClient.get_active_sessions()` is a placeholder scaffold).
- Frontend `npm run lint` required interactive ESLint setup (fixed by committing a minimal ESLint config).
- Graphify freshness must be kept aligned: after meaningful repo changes, run `graphify update .` and avoid committing stray `graphify-out/*.bak.*` artifacts.
