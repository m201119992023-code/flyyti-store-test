# V30 — Published catalog

- Customer storefront fetches only `store_products` rows with `published = true`.
- No stock quantities or `variants` records are fetched by the public storefront.
- Existing checkout remains preview-only: no orders are written and no stock is deducted.
- Availability must be verified by staff before confirming any order.
- Category mapping is provisional based on product names because store_products lacks category column.
- This ZIP has not been production build-tested.
