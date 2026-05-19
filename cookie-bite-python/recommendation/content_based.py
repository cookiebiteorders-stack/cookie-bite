from __future__ import annotations

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MinMaxScaler


class ContentBasedFilter:
    def __init__(self) -> None:
        self.tfidf = TfidfVectorizer(max_features=400)
        self.scaler = MinMaxScaler()
        self.similarity_matrix: np.ndarray | None = None
        self.product_ids: list[str] = []
        self._ready = False

    @property
    def ready(self) -> bool:
        return self._ready

    def fit(self, products: list[dict]) -> None:
        if len(products) < 2:
            self._ready = False
            return

        self.product_ids = [str(p["id"]) for p in products]
        corpus = []
        prices = []
        for p in products:
            tags = p.get("dietary") or p.get("badges") or []
            tag_str = " ".join(str(t) for t in tags) if isinstance(tags, list) else ""
            corpus.append(
                f"{p.get('name', '')} {p.get('category', '')} {p.get('title_en', '')} "
                f"{p.get('title_ar', '')} {tag_str}"
            )
            prices.append([float(p.get("price_egp") or 0)])

        text_features = self.tfidf.fit_transform(corpus).toarray()
        numeric_scaled = self.scaler.fit_transform(np.array(prices))
        combined = np.hstack([text_features, numeric_scaled])
        self.similarity_matrix = cosine_similarity(combined)
        self._ready = True

    def get_similar(self, product_id: str, top_n: int = 10) -> list[str]:
        if not self._ready or self.similarity_matrix is None:
            return []
        pid = str(product_id)
        if pid not in self.product_ids:
            return []
        idx = self.product_ids.index(pid)
        scores = list(enumerate(self.similarity_matrix[idx]))
        scores.sort(key=lambda x: x[1], reverse=True)
        out: list[str] = []
        for i, _ in scores[1 : top_n + 1]:
            out.append(self.product_ids[i])
        return out
