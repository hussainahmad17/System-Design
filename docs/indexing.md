# Indexing

## What is Indexing?
Indexing is a database technique used to speed up **read-heavy** operations.
We add an index to a column that is often used in read queries (e.g. in `WHERE` conditions).

## How It Works
1. The database builds a separate data structure (usually a **B-tree**) that keeps the column's values in sorted order. The table itself is not re-sorted.
2. To find a value, the database searches this sorted structure (similar to binary search) instead of scanning every row.
3. Each entry in the index has a **pointer** to the original row in the table.

## Complexity
- Without an index: full table scan, **O(n)**.
- With an index: **O(log n)**.

## Trade-off
- Extra storage for the index.
- Slower writes (`INSERT`, `UPDATE`, `DELETE`), because the index must be updated too.
