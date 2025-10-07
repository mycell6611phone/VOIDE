The memory module: 1. needs one input line for performing searched, an output to attach the memories, and a save input for the data stream to be saved to memory.  2. Left click menu: Options: 1.  Memory type – (buffer, summary, vector, episodic, windowed, key-value).

2.  k (retrieval count) – how many past items or vectors to fetch.

3.  Token limit – truncate or summarize when exceeding limit.

4.  Vector backend – choose embedding model / database (FAISS, Chroma, Pinecone, Milvus, etc.).

5.  Persistence toggle → ephemeral (clears every run) vs persistent (saved to disk/DB).

6.  Time-to-live (TTL) → auto-expire memories after X minutes/hours/days.

7.  Max memory size (count of items or storage MB/GB).

Retrieval Behavior:

8.  Retrieval strategy → similarity, max marginal relevance (MMR), hybrid (semantic + keyword).

9. Score threshold → minimum similarity score for retrieved memories.

10.  Deduplication → whether to merge identical or near-duplicate items.

Summarization & Compression:

11.  Summarization method → off, extractive, abstractive (choose a model).

12.  Chunk size and overlap for text splitting before embedding.

13.  Compression strategy → keep full, keep summary, keep first/last N tokens.

Indexing & Embeddings:

14.  Embedding model → OpenAI ada-002, Instructor-xl, BGE, etc.

15.  Dimensionality (auto or manual override).

16.  Batch size → control throughput during indexing.

17.  Normalize vectors (cosine vs dot-product search).  

Access & Context:

18.  Role-based context → memories scoped to system/user/assistant roles separately.

19.  Conversation scope → global memory, session memory, or node-scoped memory.

20.  Memory tagging → allow metadata fields (tags, source, timestamp).

Debugging / Developer Controls:

21.  Export/Import → save memory to file (JSON, CSV) and reload.

22.  Clear memory button → manual reset.  (button at the bottom center) labeled "Clear LLM Memory" 
Example Menu Structure

General:
  Type: [buffer | vector | summary]
  Persistence: [ephemeral | persistent]
  Token limit: [number]
  Max size: [number]
Retrieval:
  K: [number]
  Strategy: [similarity | MMR | hybrid]
  Score threshold: [float 0–1]
Embeddings:
  Model: [dropdown of embedding models]
  Vector DB: [FAISS | Chroma | Pinecone…]
  Chunk size / overlap: [number]
Maintenance:
  Summarization: [off | extractive | abstractive]
  Compression: [none | summary | truncate]
  TTL: [duration picker]
Tools:
  Inspect retrieved memories [checkbox]
  Export/Import [buttons]
  Clear memory [button]
Your goal: Create a polished left click menu for the memory module that contains the 22 items listed. Test their functions, test fore any broken code elsewhere.  Do no remove any other functions other then what is absolutely necessary to complete the task.  Thank you
