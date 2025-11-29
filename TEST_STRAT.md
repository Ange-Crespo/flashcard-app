## Test Strategy Review

Audit date: 2025‑11‑27  
Reviewer: GPT‑5.1 Codex

### Current Coverage

- **Unit tests (Vitest + React Testing Library)** already cover the Zustand store (`src/__tests__/store.test.ts`), FSRS helpers (`src/lib/__tests__/fsrs.test.ts`), GitHub Gist client (`src/lib/__tests__/githubGist.test.ts`), utility mappers, hooks (partially), and several UI components/pages (OnboardingFlow, Toast, DiscoverPage, SettingsPage, etc.).
- **Mocking strategy** relies on manual stubs inside tests or `src/test/setup.ts` (IntersectionObserver, ResizeObserver, matchMedia, localStorage/sessionStorage, etc.).
- **Fallback behaviour** is implicitly exercised by allowing real network calls to fail, which triggers logs from `useGistFlashcards`.

### Gaps & Risks

1. **Network isolation** – Vitest currently attempts real GitHub requests during hook/component tests, relying on rate-limit errors to hit the local dataset fallback. This leads to noisy logs, non-deterministic behaviour, and potential flakiness.
2. **Integration / workflow tests** – There is no automated coverage for core user flows such as onboarding, reviewing cards, persisting progress to localStorage, or editing deck mappings. Unit tests mock most context, so regressions in wiring (e.g., between `useGistFlashcards` and the store) could slip by.
3. **Storage migration validation** – Recent shift from cookies to localStorage lacks regression tests ensuring compatibility with legacy cookie payloads or multi-tab behaviour (race conditions, quota errors).
4. **Field-mapping configurator** – `DeckMappingModal` and mapping persistence logic have no direct tests, yet they manipulate complex user data.
5. **Accessibility and visual regression checks** – CSS-heavy components (FlashcardDeck animations, onboarding screens) are untested for layout/accessibility regressions.
6. **Performance-sensitive logic** – FSRS scheduling is tested at “happy path” level only; stress conditions (large decks, extreme intervals, invalid data) are not covered.

### Recommendations

| Priority | Recommendation                                        | Details                                                                                                                                                                                        |
| -------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| High     | **Mock Gist I/O with MSW or vi.mock**                 | Stub `githubGistService`/`useGistFlashcards` within tests to avoid real network calls, assert error propagation, and simulate rate limits/auth success deterministically.                      |
| High     | **Add integration tests for Discover flow**           | Use React Testing Library to mount `DiscoverPage` with mocked services + localStorage; verify onboarding gating, deck rendering, progress updates, and persistence across renders.             |
| High     | **Regression tests for storage migration**            | Create fixtures representing legacy cookie payloads, load them via `loadUserProgress`, and ensure they hydrate correctly in localStorage. Include edge cases (malformed JSON, quota exceeded). |
| Medium   | **Deck mapping tests**                                | Unit test `DeckMappingModal` and `load/saveDeckFieldMapping` to ensure mappings are serialized/deserialized properly and UI reacts to toggles.                                                 |
| Medium   | **Error-surface tests**                               | Add cases proving that `useGistFlashcards` propagates errors (once fixed) and that pages render fallback messaging. Prevent silent failures.                                                   |
| Medium   | **Property-based / fuzz tests for mapping utilities** | Tools like `fast-check` could validate `applyDeckFieldMapping` against randomly generated field combinations to catch edge cases.                                                              |
| Medium   | **FSRS stress tests**                                 | Parameterized tests for `evaluateFsrsReview` covering extreme intervals, zero/negative stability, and retrieving historical patterns, ensuring no NaN/Infinity leaks.                          |
| Low      | **Accessibility snapshot tests**                      | Use Axe or Testing Library’s `axe` integration to assert key pages/components meet WCAG basics (landmarks, ARIA labels).                                                                       |
| Low      | **Visual smoke tests**                                | Consider lightweight Storybook/Chromatic or Playwright screenshot diffs for components with rich styling (FlashcardDeck, OnboardingFlow).                                                      |

### Process Improvements

- Enforce **test doubles** for browser APIs (localStorage, fetch) via helpers to keep suites deterministic.
- Add a **coverage gate** (e.g., `vitest --coverage` in CI) to monitor gaps when new modules are introduced.
- Document **test data fixtures** (mock flashcards, local datasets) to encourage reuse and avoid ad-hoc inline objects.
