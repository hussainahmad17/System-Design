# Normalization

## What is Normalization?
Normalization is the technique of organizing database tables to remove redundant (repeated) data, usually by splitting one large table into smaller related tables.

## Example: Employees and Departments
- An `Employee` table has 10 million rows.
- It has a `Department` column, but there are only two departments: `CS` and `TX`.
- The same department name is repeated in all 10 million rows. This is **redundant data**.

**Problems with this:**
- It wastes storage.
- If a department is renamed, millions of rows must be updated, and a missed row leaves the data inconsistent.

## Solution
1. Create a separate `Department` table with `department_id` and `department_name`.
2. In the `Employee` table, replace the department name with `department_id` (a foreign key).

Now each department name is stored only once, and the `Employee` table uses `department_id` to find each employee's department.

## Trade-off
Reading the full data needs a **JOIN** between the tables, which costs a little extra query time.
