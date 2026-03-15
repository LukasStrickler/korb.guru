# Qdrant Integration

## Overview

Qdrant serves as the vector database powering semantic search, personalized recommendations, and the context improvement loop in korb.guru. The integration showcases multiple advanced Qdrant features optimized for the hackathon judging criteria.

## Collections

### 1. `products` - Hybrid Search

Stores crawled grocery products with both dense and sparse vectors for hybrid search.

- **Dense vectors**: sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 (384 dimensions) via FastEmbed
- **Sparse vectors**: BM25-style token frequency vectors
- **Fusion**: Reciprocal Rank Fusion (RRF) for combining dense + sparse results
- **Payload indexes**: `retailer` (keyword), `category` (keyword), `price` (float range), `valid_to` (datetime)

**Use cases**:

- Semantic product search ("find cheap pasta sauce")
- Price comparison across retailers for specific ingredients
- Filtered search by retailer, price range, or category
- Current deals and discounts discovery

### 2. `recipes` - Semantic Search + Discovery

Stores recipe embeddings generated from title + description + ingredients.

- **Vector**: Dense 384d
- **Payload indexes**: `type`, `cost`, `time_minutes`, `household_id`

**Use cases**:

- Semantic recipe search ("quick healthy dinner")
- Discovery API with context pairs for improving recommendations
- Filtered by cooking time, cost, dietary type

### 3. `user_preferences` - Recommendation Engine

Stores accumulated preference vectors per user, updated through swipe interactions.

- **Vector**: Running average of accepted recipe embeddings, adjusted by rejections
- **Payload**: `user_id`, `total_accepts`, `total_rejects`

**Use cases**:

- Recommendation API with positive/negative examples
- Preference-based recipe discovery
- Context improvement tracking

## Key Features Showcased

### 1. Hybrid Search (Dense + Sparse BM25 with RRF)

```python
results = client.query_points(
    collection_name="products",
    prefetch=[
        models.Prefetch(query=sparse_vector, using="sparse", limit=20),
        models.Prefetch(query=dense_vector, using="dense", limit=20),
    ],
    query=models.FusionQuery(fusion=models.Fusion.RRF),
    query_filter=models.Filter(
        must=[
            models.FieldCondition(key="retailer", match=models.MatchAny(any=["migros", "coop"])),
            models.FieldCondition(key="price", range=models.Range(lte=10.0)),
        ]
    ),
    limit=10,
)
```

### 2. Discovery API with Context Pairs

The Discovery API uses positive/negative context pairs to improve search results over time. As users swipe recipes, we accumulate context pairs that refine future recommendations.

### 3. Recommendation API

Uses swipe history (accepts as positive, rejects as negative) to generate personalized recipe recommendations.

### 4. Payload Filtering

Extensive use of payload filters for:

- Dietary restrictions (recipe type)
- Price ranges (budget constraints)
- Retailer filtering (preferred stores)
- Validity dates (current offers only)

### 5. Named Vectors

The `products` collection uses named vectors (`dense` and `sparse`) enabling multi-strategy search on the same collection.

## Context Improvement Loop

This is the key differentiator for the Qdrant challenge:

1. **Phase 1**: Basic hybrid search for products and recipes
2. **Phase 2**: User swipes recipes -> builds preference vector in `user_preferences`
3. **Phase 3**: Discovery API uses accumulated context pairs to improve recommendations
4. **Phase 4**: Track search quality metrics across user interactions

The preference vector is updated with each swipe:

- **Accept**: Vector moves toward the accepted recipe embedding
- **Reject**: Vector moves slightly away from the rejected recipe embedding
- Weight decreases with more interactions (diminishing adjustment)

## Cloud vs Local Setup

```env
# Cloud (for production / demo)
QDRANT_MODE=cloud
QDRANT_URL=https://xxx.cloud.qdrant.io:6333
QDRANT_API_KEY=your-key

# Docker (local development)
QDRANT_MODE=docker
QDRANT_HOST=qdrant
QDRANT_PORT=6333

# In-memory (testing)
QDRANT_MODE=memory
```

The client factory in `backend/app/qdrant/client.py` handles switching transparently.

## Embedding Model

We use `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (384 dimensions) via FastEmbed:

- Fast inference (runs locally, no API calls)
- Native multilingual support (50+ languages including German, French, Italian)
- Ideal for Swiss grocery products with mixed-language names
- Small model size suitable for hackathon deployment
