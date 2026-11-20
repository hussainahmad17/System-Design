// The store's categories. The handle is the URL slug and the value stored on each product.
export const CATEGORIES = ["leather-jackets", "shoes", "watches", "sunglasses", "clothing"];

// Sizes offered per category. "One size" products are added to the cart without a size picker.
export const SIZES_BY_CATEGORY = {
  "leather-jackets": ["XS", "S", "M", "L", "XL", "XXL"],
  clothing: ["XS", "S", "M", "L", "XL", "XXL"],
  shoes: ["39", "40", "41", "42", "43", "44", "45", "46"],
  watches: ["One size"],
  sunglasses: ["One size"],
};
