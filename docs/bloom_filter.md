# Bloom Filter

A Bloom filter is a small, fast data structure that answers one question:
**"Have I seen this item before?"**

It gives one of two answers:
- **"Definitely not"** (always correct)
- **"Probably yes"** (usually correct, sometimes wrong)

## The Problem It Solves
Imagine signing up on Gmail. You type a username, and Gmail must check whether it is already taken.
Searching a database of billions of usernames on every keystroke is slow and expensive.
A Bloom filter answers almost instantly, using very little memory, and only goes to the database when needed.

## How It Works
It uses two things:
1. **A bit array:** a row of boxes, each holding 0 or 1. All start at 0.
2. **A few hash functions:** each turns an item into a box number.

**To add an item:** run it through every hash function and set those boxes to 1.
**To check an item:** run it through the same hash functions and look at those boxes.
- If **any** box is 0, the item was **definitely not** added.
- If **all** boxes are 1, the item was **probably** added.

## Practical Example
Bit array of 10 boxes, 2 hash functions.

```
Start:        [0 0 0 0 0 0 0 0 0 0]
index:         0 1 2 3 4 5 6 7 8 9
```

**Add "alice"** → hashes give boxes 2 and 7
```
              [0 0 1 0 0 0 0 1 0 0]
```

**Add "bob"** → hashes give boxes 4 and 7
```
              [0 0 1 0 1 0 0 1 0 0]
```

**Check "dave"** → hashes give boxes 1 and 4
Box 1 is 0 → **"dave" is definitely not taken.** No database call needed.

**Check "carol"** → hashes give boxes 2 and 4
Both are 1 → **"probably taken"**, but "carol" was never added.
Those boxes were set by "alice" and "bob". This is a **false positive**, so we confirm with the database.

## Key Properties
- **No false negatives:** if it says "not present", it is never wrong.
- **False positives are possible:** "present" means "maybe", so verify when it matters.
- **Cannot delete items:** clearing a box may also erase another item that shares it.
- **Very memory efficient:** stores bits, not the items themselves.
- **Fast:** add and check both take O(k) time, where k is the number of hash functions.

## Reducing False Positives
- Use a **bigger bit array** (fewer boxes shared between items).
- Use the **right number of hash functions** (too few or too many both increase errors).

## Real-World Uses
- **Username availability checks:** skip the database for names that are definitely free.
- **Databases (Cassandra, HBase):** skip reading disk files that definitely don't contain a key.
- **Web browsers:** check URLs against a list of malicious sites.
- **Caches and CDNs:** avoid caching items that were requested only once.

## When Not to Use It
- When you need a 100% accurate "yes".
- When you need to delete items (use a Counting Bloom Filter instead).
- When you need to retrieve the stored items themselves.
