# /packages/main/src/services — Main Process Services

Service abstractions for the main process (DB, models, validation, FAISS client).

**Guidelines**
- Keep DB access (`db.ts`) confined here; expose high-level APIs.
- `faissClient.ts` should gracefully handle the FAISS daemon being unavailable.
- `secrets.ts` must store data securely offline (e.g., keytar) and never sync to cloud.
- Validation helpers should reuse schemas from `@voide/schemas`/`@voide/ipc`.
