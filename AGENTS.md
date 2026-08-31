# Devin instructions

- Each vendor integration lives **only** in its own adapter under `src/lib/` (`stripe.ts`, `openai.ts`).
- Run tests with `npm test`.
- When fixing an integration incident, make the smallest change in the adapter, add a regression test and fixture for the new contract shape, and do not refactor unrelated code.
- Do not touch the UI or the vendor/gateway while repairing an integration incident.
- Always open a PR on a new branch. Never merge or deploy.
