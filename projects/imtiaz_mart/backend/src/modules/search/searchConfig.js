// Atlas Search setup: the index definition and the synonym list.
// Atlas Search runs Apache Lucene next to MongoDB and keeps this index in sync with the
// products collection automatically (no separate search cluster to feed or babysit).

export const SEARCH_INDEX = "products_search";
export const SYNONYM_MAPPING = "product_synonyms";
export const SYNONYM_COLLECTION = "search_synonyms";

// What gets indexed and how.
// - lucene.english: lowercases, drops "the/and", stems ("jackets" -> "jacket", "watches" -> "watch")
// - autocomplete (edgeGram): stores prefixes "a", "as", "ash"... so "ashf" matches "Ashford" while typing
// - token: exact values, used for the category filter
// - number/objectId: used for the tie-breaking sort, so pagination is stable
export const SEARCH_INDEX_DEFINITION = {
  mappings: {
    dynamic: false, // index only the fields below: smaller index, faster queries
    fields: {
      name: [
        { type: "string", analyzer: "lucene.english" },
        { type: "autocomplete", tokenization: "edgeGram", minGrams: 2, maxGrams: 15, foldDiacritics: true },
      ],
      style: { type: "string", analyzer: "lucene.english" },
      colour: { type: "string", analyzer: "lucene.english" },
      gender: { type: "string", analyzer: "lucene.english" },
      category: [
        { type: "string", analyzer: "lucene.english" }, // "leather-jackets" -> leather, jacket
        { type: "token" }, // exact match for the category filter
      ],
      salesCount: { type: "number" },
      _id: { type: "objectId" },
    },
  },
  synonyms: [{ name: SYNONYM_MAPPING, analyzer: "lucene.english", source: { collection: SYNONYM_COLLECTION } }],
};

// Equivalent groups: searching any word finds products described with any other.
// Kept in a collection (not code) so they can be edited without a deploy; Atlas picks up changes.
export const SYNONYMS = [
  ["sneaker", "trainer", "kicks", "running shoe", "tennis shoe"],
  ["boot", "bootie"],
  ["loafer", "slip-on", "moccasin"],
  ["oxford", "brogue", "dress shoe", "formal shoe"],
  ["shoe", "footwear"],
  ["jacket", "coat", "outerwear"],
  ["biker", "moto", "motorcycle", "rider"],
  ["bomber", "flight jacket"],
  ["sunglasses", "shades", "sunnies", "eyewear"],
  ["watch", "timepiece", "wristwatch"],
  ["chronograph", "chrono"],
  ["diver", "dive watch"],
  ["t-shirt", "tee", "tshirt"],
  ["knit sweater", "sweater", "jumper", "pullover", "knitwear"],
  ["blazer", "sport coat", "suit jacket"],
  ["chinos", "trousers", "pants", "khakis"],
  ["men", "mens", "man", "male", "gents"],
  ["women", "womens", "woman", "ladies", "female"],
  ["grey", "gray"],
  ["tan", "beige", "camel"],
  ["burgundy", "maroon", "wine"],
  ["navy", "dark blue"],
].map((synonyms) => ({ _id: synonyms[0], mappingType: "equivalent", synonyms }));
