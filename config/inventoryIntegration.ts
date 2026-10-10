/**
 * V24: preparation for real inventory integration.
 * No Supabase tables are queried or changed in this version.
 * IMPORTANT: Never expose POS-only inventory via anonymous RLS policies.
 * The public store should read from a dedicated published catalog view/API,
 * with availability and prices authorized by the server.
 */
export type PublishedStoreProduct = {
  publicId: string;
  title: string;
  priceIls: number;
  availableQuantity: number;
  isPublished: boolean;
  imageUrl?: string;
  description?: string;
  warrantyText?: string;
};
export const isAvailable = (product: PublishedStoreProduct, quantity = 1) =>
  product.isPublished && Number.isInteger(quantity) && quantity > 0 &&
  product.availableQuantity >= quantity;
