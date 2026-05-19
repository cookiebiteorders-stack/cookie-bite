from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix
from sklearn.decomposition import TruncatedSVD

EVENT_WEIGHTS = {
    "view": 1,
    "add_to_cart": 3,
    "wishlist": 2,
    "purchase": 5,
}


class CollaborativeFilter:
    def __init__(self, n_components: int = 32) -> None:
        self.svd = TruncatedSVD(n_components=n_components, random_state=42)
        self.user_index: dict[str, int] = {}
        self.product_list: np.ndarray | None = None
        self.user_factors: np.ndarray | None = None
        self.product_factors: np.ndarray | None = None
        self._ready = False

    @property
    def ready(self) -> bool:
        return self._ready

    def fit(self, rows: list[tuple[str, str, str]]) -> None:
        """rows: (user_id, product_id, event_type) — user_id must be non-null."""
        if not rows:
            self._ready = False
            return

        df = pd.DataFrame(rows, columns=["user_id", "product_id", "event_type"])
        df = df[df["user_id"].notna() & (df["user_id"] != "")]
        if df.empty or df["user_id"].nunique() < 2:
            self._ready = False
            return

        df["weight"] = df["event_type"].map(EVENT_WEIGHTS).fillna(1)
        df = df.groupby(["user_id", "product_id"], as_index=False)["weight"].sum()

        users = df["user_id"].unique()
        products = df["product_id"].unique()
        if len(users) < 2 or len(products) < 2:
            self._ready = False
            return

        self.user_index = {str(u): i for i, u in enumerate(users)}
        product_index = {str(p): i for i, p in enumerate(products)}
        self.product_list = products

        row_idx = df["user_id"].map(self.user_index).astype(int)
        col_idx = df["product_id"].map(product_index).astype(int)
        matrix = csr_matrix(
            (df["weight"].astype(float), (row_idx, col_idx)),
            shape=(len(users), len(products)),
        )

        self.user_factors = self.svd.fit_transform(matrix)
        self.product_factors = self.svd.components_.T
        self._ready = True

    def recommend(self, user_id: str, top_n: int = 10) -> list[str]:
        if not self._ready or self.product_list is None:
            return []
        uid = str(user_id)
        if uid not in self.user_index or self.user_factors is None or self.product_factors is None:
            return []
        u_vec = self.user_factors[self.user_index[uid]]
        scores = self.product_factors @ u_vec
        top_idx = np.argsort(scores)[::-1][:top_n]
        return [str(self.product_list[i]) for i in top_idx]
