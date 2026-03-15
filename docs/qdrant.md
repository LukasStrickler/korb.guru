# Qdrant in korb.guru -- Swiss Grocery Shopping Assistant

> **Hackathon thesis:** Every user interaction -- swipes, searches, purchases -- feeds back into Qdrant's vector space, making the system smarter with each use. korb.guru is a self-improving grocery assistant where Qdrant is not just a database but the intelligence layer.

---

## Why Qdrant?

korb.guru is a multilingual Swiss grocery assistant serving users across German, French, and Italian-speaking regions. We needed a vector database that could handle:

1. **Hybrid search** (dense + sparse vectors in the same collection) -- Swiss grocery queries mix exact brand names ("Cailler Schokolade") with semantic intent ("something sweet for dessert"). Neither pure semantic nor pure keyword search works alone.
2. **Named vectors** -- Products need both a dense embedding for semantic meaning and a sparse vector for BM25-style keyword matching, stored together in a single point.
3. **Recommend API with positive/negative examples** -- Our swipe-based recipe discovery (think Tinder for recipes) maps directly to Qdrant's recommend interface with liked/disliked recipe IDs.
4. **Discovery API with context pairs** -- As users accumulate swipe history, we build context pairs (accepted vs. rejected recipes) that progressively refine recommendations beyond simple positive/negative.
5. **Rich payload filtering** -- Filtering by retailer, price range, discount percentage, category, and expiration date must happen at the vector search level, not as a post-filter.
6. **Multiple deployment modes** -- Development uses in-memory or local Docker, production uses Qdrant Cloud. The client abstraction must support all modes cleanly.

### Why not the alternatives?

| Criteria                       | pgvector                 | Pinecone         | Weaviate               | **Qdrant**                                          |
| ------------------------------ | ------------------------ | ---------------- | ---------------------- | --------------------------------------------------- |
| Hybrid search (dense + sparse) | No native sparse vectors | No named vectors | BM25 module (separate) | **Named vectors + sparse in same collection**       |
| Recommend API                  | None                     | None             | None                   | **First-class with positive/negative IDs**          |
| Discovery API / context pairs  | None                     | None             | None                   | **Built-in context pair support**                   |
| Payload filtering              | SQL WHERE (good)         | Metadata filters | Filters (good)         | **Typed indexes: KEYWORD, FLOAT, DATETIME**         |
| IDF modifier on sparse vectors | N/A                      | N/A              | N/A                    | **`Modifier.IDF` on sparse vector config**          |
| Reciprocal Rank Fusion         | Manual implementation    | Manual           | Manual                 | **`Fusion.RRF` as a query strategy**                |
| Quantization (INT8)            | None                     | Managed          | PQ only                | **Scalar quantization with oversampling + rescore** |
| Self-hosted + Cloud            | Self-hosted only         | Cloud only       | Both                   | **Both, plus in-memory for tests**                  |

Qdrant is the only engine where our hybrid search, recommendation, and discovery patterns are first-class primitives rather than application-level workarounds.

---

## Architecture

```
+-------------------+       +-------------------+       +-------------------+
|   React Native    |       |  Weekly Crawlers   |       |   Apify Actors    |
|   Mobile App      |       |  (SmartCart)       |       |  (5 retailers)    |
+--------+----------+       +--------+----------+       +--------+----------+
         |                           |                            |
         | REST API                  | fastembed                  | fastembed
         v                           v                            v
+--------+---------------------------+----------------------------+----------+
|                        FastAPI Backend (Python)                            |
|                                                                           |
|  +-------------+  +----------------+  +----------------+  +------------+  |
|  | Product     |  | Recipe         |  | Discovery      |  | Embedding  |  |
|  | Service     |  | Service        |  | Service        |  | Service    |  |
|  | (hybrid)    |  | (recommend)    |  | (context pairs)|  | (MiniLM)   |  |
|  +------+------+  +-------+-------+  +-------+--------+  +-----+------+  |
|         |                 |                   |                  |         |
|         +--------+--------+--------+----------+------------------+        |
|                  |                  |                                      |
|                  v                  v                                      |
|         +-------+-------+  +------+--------+                              |
|         |   Qdrant      |  |  PostgreSQL   |                              |
|         |   (vectors)   |  |  (relational) |                              |
|         +---------------+  +---------------+                              |
+---------------------------------------------------------------------------+

Qdrant Collections:
  products         -- hybrid dense+sparse, 5 retailers, ~50k+ products
  recipes          -- dense vectors, recommend API, swipe-driven
  user_preferences -- dense vectors, per-user taste profile, evolving
```

---

## Collection Schemas

### 1. `products` -- Hybrid Search Collection

The products collection is the backbone of korb.guru's search. It stores grocery items from all 5 Swiss retailers (Migros, Coop, Aldi Suisse, Denner, Lidl) with both dense and sparse vectors for hybrid retrieval.

```python
# Collection creation (apps/api/src/qdrant/collections.py)
client.create_collection(
    collection_name="products",
    vectors_config={
        "dense": VectorParams(size=384, distance=Distance.COSINE),
    },
    sparse_vectors_config={
        "sparse": SparseVectorParams(modifier=Modifier.IDF),
    },
)
```

**Vector configuration:**

| Vector   | Type         | Dimensions               | Distance | Notes                                          |
| -------- | ------------ | ------------------------ | -------- | ---------------------------------------------- |
| `dense`  | Named dense  | 384                      | Cosine   | `paraphrase-multilingual-MiniLM-L12-v2`        |
| `sparse` | Named sparse | 2^20 (1,048,576 buckets) | N/A      | MD5-hashed BM25-style tokens with IDF modifier |

**Payload indexes:**

| Field          | Schema Type | Purpose                                     |
| -------------- | ----------- | ------------------------------------------- |
| `retailer`     | KEYWORD     | Filter by store chain (Migros, Coop, etc.)  |
| `category`     | KEYWORD     | Filter by product category                  |
| `region`       | KEYWORD     | Filter by Swiss region (zurich, bern, etc.) |
| `price`        | FLOAT       | Range filter for budget constraints         |
| `discount_pct` | FLOAT       | Sort/filter for deals endpoint              |
| `valid_to`     | DATETIME    | Exclude expired promotions                  |

**Point structure (ingested by crawlers):**

```python
PointStruct(
    id=md5_hex(f"{retailer}:{name}:{brand}:{category}"),  # deterministic dedup
    vector={
        "dense": [0.012, -0.034, ...],   # 384-dim from MiniLM
        "sparse": SparseVector(
            indices=[48291, 738201, ...],  # MD5 hash mod 2^20
            values=[1.0, 2.0, ...],        # token frequencies
        ),
    },
    payload={
        "retailer": "migros",
        "name": "Bio Vollmilch 1L",
        "price": 1.95,
        "category": "Milchprodukte",
        "discount_pct": 20.0,
        "valid_from": "2025-01-06T00:00:00Z",
        "valid_to": "2025-01-12T00:00:00Z",
        "image_url": "https://...",
        "source": "smartcart",          # or "apify"
    },
)
```

### 2. `recipes` -- Recommendation Collection

The recipes collection powers semantic search and the Recommend API for recipe discovery. Recipes are embedded from their title, description, and ingredient list.

```python
client.create_collection(
    collection_name="recipes",
    vectors_config=VectorParams(size=384, distance=Distance.COSINE),
)
```

**Payload indexes:** `type` (KEYWORD), `cost` (FLOAT), `time_minutes` (INTEGER), `household_id` (KEYWORD)

**Embedding text formula:**

```python
text = f"{recipe.title} {recipe.description or ''} {' '.join(i.name for i in ingredients)}"
vector = embed_text(text)  # 384-dim MiniLM
```

### 3. `user_preferences` -- Evolving Taste Vectors

Each user has a single point in this collection representing their aggregated taste profile. The vector is not a static embedding -- it evolves with every swipe interaction using exponential moving average updates.

```python
client.create_collection(
    collection_name="user_preferences",
    vectors_config=VectorParams(size=384, distance=Distance.COSINE),
)
```

**Payload indexes:** `user_id` (KEYWORD), `household_id` (KEYWORD)

Multi-tenancy: each preference vector is scoped to a household via `household_id`, ensuring that when a user switches households, their preference context stays isolated. This prevents preference leakage between household contexts.

**Vector update logic (on each swipe):**

```python
weight = 1.0 / (total_interactions + 1)   # accept
weight = -0.5 / (total_interactions + 1)   # reject

new_vector[i] = old_vector[i] + weight * (recipe_vector[i] - old_vector[i])
```

The weighting scheme means early interactions have stronger influence (cold-start bootstrap), while later interactions cause finer adjustments. Rejects push the vector away from disliked recipes at half the magnitude of accepts, preventing overreaction to occasional swipe-lefts.

---

## Hybrid Search Deep-Dive

The product search endpoint (`GET /api/v1/products/search`) executes a hybrid query combining dense semantic search with sparse keyword matching using Reciprocal Rank Fusion (RRF).

### Why hybrid?

Swiss grocery products present a unique search challenge:

- **Semantic search alone fails** on brand names and product codes. A query for "Farmer Knusper-Muesli" needs exact token matching, not just "breakfast cereal" semantics.
- **Keyword search alone fails** on intent-based queries. "something healthy for lunch" has no keyword overlap with "Quinoa Salat mit Poulet" but high semantic similarity.
- **Multilingual complication:** Swiss users query in German, French, or Italian. The MiniLM model handles semantic cross-language similarity, while sparse vectors catch exact terms that appear in the product catalog regardless of language.

### Query execution flow

```
User query: "guenstige Bio Milch"
         |
         v
+--------+--------+
|  Embed query     |
|  dense: MiniLM   |  -->  384-dim float vector
|  sparse: MD5/BM25|  -->  sparse vector (token hashes + counts)
+---------+--------+
          |
          v
+------------------------------------------+
|  Qdrant query_points()                   |
|                                          |
|  prefetch[0]: sparse query               |
|    using="sparse", limit=20              |
|    (BM25-style keyword retrieval)        |
|                                          |
|  prefetch[1]: dense query                |
|    using="dense", limit=20              |
|    (semantic similarity retrieval)       |
|                                          |
|  fusion: Fusion.RRF                      |
|    (Reciprocal Rank Fusion)              |
|                                          |
|  filter: retailer IN [...] AND           |
|          price <= max_price AND           |
|          category == "..."                |
+------------------------------------------+
          |
          v
    Top-k merged results
```

### Sparse vector construction

We use a deterministic MD5-based hashing scheme rather than a learned sparse model. Each token is hashed to one of 2^20 (~1M) buckets, and the value is the token frequency in the text. The IDF modifier on the sparse vector config in Qdrant automatically downweights common terms.

```python
SPARSE_DIM = 2**20

def _sparse_vector(text: str) -> tuple[list[int], list[float]]:
    tokens = text.lower().split()
    seen: dict[int, int] = {}
    for token in tokens:
        h = int(hashlib.md5(token.encode()).hexdigest(), 16) % SPARSE_DIM
        seen[h] = seen.get(h, 0) + 1
    return list(seen.keys()), [float(v) for v in seen.values()]
```

This approach is intentionally simple and deterministic: the same token always maps to the same bucket, both at ingestion time (in the crawlers) and at query time (in the API). No model training required, no vocabulary files to synchronize.

### RRF fusion

Qdrant's built-in `Fusion.RRF` combines the two prefetch result sets using the formula:

```
score(doc) = sum( 1 / (k + rank_in_list) )  for each prefetch list containing doc
```

This is superior to simple score normalization because it is rank-based, making it invariant to the different score scales of dense cosine similarity (0 to 1) and sparse BM25-style scores (unbounded).

---

## Self-Improving Context: The Hackathon Thesis

korb.guru is built around a core insight: **a grocery assistant should get smarter the more you use it.** Every user interaction writes back into Qdrant's vector space, creating three self-reinforcing feedback loops.

### Loop 1: Product Catalog Freshness (Weekly Crawl)

Two independent crawling systems refresh the product catalog on a weekly schedule:

- **SmartCart crawler** -- Direct website scraping of 5 Swiss retailers using Playwright, with CSS selector health monitoring to detect site changes.
- **Apify orchestrator** -- Cloud-based scraping via a custom `swiss-grocery-scraper` Actor, with retry logic and timeout handling.

Both crawlers use `fastembed` with the same `paraphrase-multilingual-MiniLM-L12-v2` model and identical MD5-based sparse vector construction, ensuring vector space consistency. Products are upserted with deterministic IDs (`md5(retailer:name:brand:category)`) so price changes update existing points rather than creating duplicates.

### Loop 2: Swipe-Driven Taste Profiling

When a user swipes on a recipe:

1. The swipe action is recorded in PostgreSQL (`swipe_actions` table).
2. The recipe's embedding is computed.
3. The user's preference vector in `user_preferences` is updated via exponential moving average.
4. Future recipe recommendations use the updated preference vector as the search target.

The preference vector does not just store "liked categories" -- it encodes a nuanced position in the 384-dimensional taste space that captures ingredient preferences, cooking complexity, cost sensitivity, and cuisine affinity simultaneously.

### Loop 3: Discovery API with Context Pairs

This is the key differentiator. As users accumulate swipe history, we build **context pairs** from their accepted and rejected recipes:

```python
for i, accept in enumerate(accepts[:max_pairs]):
    reject = rejects[i % len(rejects)]
    pairs.append(ContextPair(
        positive=str(accept.recipe_id),
        negative=str(reject.recipe_id),
    ))
```

These context pairs feed into Qdrant's Discovery/Recommend API, which uses them to define a search region in vector space that is "near recipes like this, far from recipes like that." The more the user swipes, the more precise this region becomes.

### The four phases of personalization

We track and expose the personalization lifecycle via a `/discovery-metrics` endpoint:

| Phase          | Swipes | Behavior                                                               |
| -------------- | ------ | ---------------------------------------------------------------------- |
| `cold_start`   | 0      | Default recommendations ("healthy meal" embedding)                     |
| `learning`     | 1--4   | Building initial preference profile, coarse adjustments                |
| `personalized` | 5--14  | Preference vector established, Discovery API active with context pairs |
| `refined`      | 15+    | Rich context history, highly personalized recommendations              |

This phased approach is visible to the user: they can literally see their recommendations improve as they interact more, creating a compelling engagement loop.

---

## Preference-Based Re-Ranking

The product search endpoint (`GET /api/v1/products/search`) supports optional preference-based re-ranking. When a user is authenticated, their preference vector from the `user_preferences` collection is fetched and used to blend the original hybrid search score with a preference similarity score.

**How it works:**

1. Hybrid search (dense + sparse with RRF) runs as usual, producing ranked results.
2. The user's preference vector is fetched from `user_preferences`.
3. Each result's dense vector is compared to the preference vector via cosine similarity.
4. The final score is a weighted blend: `(1 - w) * original_score + w * preference_similarity`, where `w = 0.3`.
5. Results are re-sorted by the blended score.

This means returning users see results biased toward their established taste profile, while the underlying hybrid retrieval still ensures relevance to the query. Users without a preference vector get standard unmodified results.

---

## Personalized Product Recommendations

The `GET /api/v1/products/recommended` endpoint uses the user's preference vector directly as a Qdrant query against the `products` collection's dense vector space. This surfaces products that are closest to the user's accumulated taste profile, independent of any search query.

This is distinct from search: recommendations answer "what products would this user like?" rather than "what products match this query?" The preference vector encodes information from all past feedback interactions, so recommendations improve as the user provides more feedback.

Optional `retailers` filtering is supported to scope recommendations to specific stores.

---

## Batch Search

The `POST /api/v1/products/batch-search` endpoint accepts a list of queries (up to 20) and executes them all in a single Qdrant `query_batch_points()` call. This is designed for use cases like:

- **Recipe ingredient shopping:** Given a list of ingredients, find the best product match for each one simultaneously.
- **Meal planning:** Search for multiple meal components in one request.
- **Price comparison:** Compare prices for a shopping list across retailers.

Each query in the batch runs the same hybrid search pipeline (dense + sparse with RRF fusion) as the single search endpoint. The batch call avoids the overhead of N sequential round-trips to Qdrant, which is significant when searching for 10-20 ingredients at once.

**Request format:**

```json
{
  "queries": ["Bio Milch", "Vollkornbrot", "Freiland Eier"],
  "retailers": ["migros", "coop"],
  "max_price": 5.0,
  "limit": 5
}
```

**Response:** A dictionary mapping each query string to its list of matching products.

---

## Qdrant Feature Usage Table

| Qdrant Feature                                   | Where Used                | Purpose                                                      |
| ------------------------------------------------ | ------------------------- | ------------------------------------------------------------ |
| **Named vectors** (dense + sparse)               | `products` collection     | Store semantic and keyword vectors in one point              |
| **Sparse vectors with IDF modifier**             | `products` collection     | BM25-style keyword matching with automatic IDF weighting     |
| **Reciprocal Rank Fusion** (`Fusion.RRF`)        | Product search            | Merge dense and sparse prefetch results                      |
| **Prefetch queries**                             | Product hybrid search     | Two-stage retrieval: sparse + dense before fusion            |
| **Recommend API** (positive/negative)            | Recipe recommendations    | Swipe-based recipe suggestions using liked/disliked IDs      |
| **Context pairs**                                | Discovery service         | Progressively refined search regions from swipe history      |
| **Payload filtering** (KEYWORD, FLOAT, DATETIME) | Product and recipe search | Filter by retailer, price, category, expiration, household   |
| **MatchAny filter**                              | Product search            | Multi-retailer selection (`retailer IN [...]`)               |
| **Range filter**                                 | Product search, deals     | Price ceiling, discount minimum                              |
| **IsNull condition**                             | Recipe search             | Include public recipes (null household_id) alongside private |
| **OrderBy**                                      | Deals endpoint            | Sort products by discount percentage descending              |
| **Scroll API**                                   | Deals, preference lookup  | Iterate over filtered results without vector query           |
| **Upsert with deterministic IDs**                | Crawler ingestion         | Idempotent product updates across weekly crawls              |
| **Multi-mode client**                            | All services              | cloud / docker / local / memory deployment flexibility       |
| **Region-scoped KEYWORD index**                  | Product search            | Filter products by Swiss region (zurich, bern, basel)        |
| **Multi-tenant preference vectors**              | `user_preferences`        | Household-scoped taste profiles prevent preference leakage   |
| **Scalar quantization** (INT8)                   | `products` collection     | Reduce memory with oversampling+rescore for accuracy         |
| **Preference-based re-ranking**                  | Product search            | Blend hybrid scores with user preference similarity          |
| **query_batch_points**                           | Batch search endpoint     | Execute multiple hybrid queries in a single round-trip       |
| **Dense vector query for recommendations**       | Recommended endpoint      | Query products using user preference vector as target        |

---

## Embedding Strategy

### Model: `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`

- **384 dimensions** -- Compact enough for fast search, expressive enough for grocery semantics.
- **50+ languages** -- Critical for Switzerland's trilingual market (German, French, Italian).
- **Paraphrase-optimized** -- Captures that "Poulet Brust" and "Huehnerbrust" are the same thing.
- **Local inference** via `fastembed` (crawlers) and `sentence-transformers` (API) -- no external API dependency for embeddings.

The same model is used consistently across all three entry points:

1. **API service** -- Embeds user queries at search time.
2. **SmartCart crawler** -- Embeds scraped products at ingestion time.
3. **Apify crawler** -- Embeds actor results at ingestion time.

This ensures vector space consistency: a product embedded by the crawler will be found by a semantically similar query from the API.

---

## Production Deployment

### Client modes

The Qdrant client supports four modes, configured via `QDRANT_MODE` environment variable:

| Mode     | Use Case                  | Configuration                                          |
| -------- | ------------------------- | ------------------------------------------------------ |
| `memory` | Unit tests                | `QdrantClient(":memory:")`                             |
| `local`  | Solo dev, no Docker       | `QdrantClient(path="./qdrant_data")`                   |
| `docker` | Local dev (compose)       | `QdrantClient(host="qdrant", port=6333)`               |
| `cloud`  | Production (Qdrant Cloud) | `QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)` |

### Docker Compose (local dev)

```yaml
qdrant:
  image: qdrant/qdrant:v1.12.4
  ports:
    - "6333:6333" # REST API
    - "6334:6334" # gRPC
  volumes:
    - qdrant_data:/qdrant/storage
```

### Production considerations

- **Scalar quantization (INT8)** on the `products` collection reduces memory footprint for large catalogs while maintaining search quality via oversampling with rescore.
- **Deterministic point IDs** (MD5 hash of retailer + name + brand + category) enable idempotent upserts -- running the crawler twice does not create duplicate products.
- **Batch upserts** in chunks of 100 points for optimal throughput during weekly ingestion of tens of thousands of products.

---

## Future Plans

1. **Multi-vector recipes** -- Add sparse vectors to the recipes collection for hybrid search (currently dense-only). Users searching for "Rezept mit Tofu und Brokkoli" would benefit from exact ingredient matching.

2. **Group recommendations** -- Use Qdrant's grouping feature to cluster recipe results by cuisine type, so the discovery feed shows diverse categories rather than 10 similar pasta dishes.

3. **Geo-filtered product search** -- Add a GEO payload index on store location to surface products available at the user's nearest stores, not just the retailer chain level.

4. **Purchase history feedback** -- When a user actually buys ingredients from a recommended recipe, boost the corresponding vectors more aggressively than swipe-accepts. Purchases are stronger intent signals than swipes.

5. **Seasonal vector drift** -- Track how the user preference vector shifts over time (summer salads vs. winter soups) and use time-weighted context pairs in the Discovery API.

6. **Cross-collection search** -- Link product and recipe collections so that searching for "guenstiges Abendessen" simultaneously returns matching recipes and the cheapest ingredient bundles across retailers.

7. **A/B testing with Qdrant snapshots** -- Use collection snapshots to test different embedding models or fusion strategies against live user satisfaction metrics.

---

## Summary

korb.guru uses Qdrant as the intelligence backbone, not just a storage layer. Three collections work together to create a self-improving grocery assistant:

- **`products`** provides hybrid search across 5 Swiss retailers, combining semantic understanding with keyword precision via RRF fusion.
- **`recipes`** enables swipe-driven discovery using the Recommend API with positive/negative examples from user history.
- **`user_preferences`** maintains an evolving taste vector per user that gets refined with every interaction.

The result is a system where searching, swiping, and shopping all feed back into Qdrant, making every future interaction more relevant. That is the korb.guru thesis: **the more you use it, the smarter your grocery basket gets.**
