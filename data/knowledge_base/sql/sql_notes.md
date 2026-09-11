# SQL & Relational Database Engineering

## Topic: Joins & Set Operations
- **Domain**: sql
- **Topic**: joins_and_sets
- **Difficulty**: medium

### SQL Join Types
- **INNER JOIN**: Returns records that have matching values in both tables.
- **LEFT (OUTER) JOIN**: Returns all records from the left table, and the matched records from the right table. Missing values on the right are NULL.
- **RIGHT (OUTER) JOIN**: Returns all records from the right table, and matched records from the left.
- **FULL (OUTER) JOIN**: Returns all records when there is a match in either left or right table.
- **CROSS JOIN**: Produces the Cartesian product of rows from both tables.

```sql
SELECT e.employee_id, e.name, d.department_name
FROM employees e
INNER JOIN departments d ON e.department_id = d.department_id;
```

---

## Topic: Indexing & Query Optimization
- **Domain**: sql
- **Topic**: indexing_optimization
- **Difficulty**: hard

### B-Tree & Hash Indexes
- **B-Tree Indexes**: Default index structure supporting equality, range queries (`<`, `<=`, `>`, `>=`, `BETWEEN`), and prefix searches (`LIKE 'abc%'`).
- **Hash Indexes**: O(1) lookup speed for exact equality matches (`=`), but do not support range scans or sorting.

### Optimization Techniques
- Analyze query execution plans using `EXPLAIN ANALYZE`.
- Avoid selecting unnecessary columns with `SELECT *`; specify needed attributes explicitly.
- Use covering indexes where all required query columns exist inside the index tree.
- Be cautious of function calls on indexed columns (e.g. `WHERE LOWER(email) = ...`) which can invalidate index usage unless functional indexes are defined.

---

## Topic: Window Functions & Aggregations
- **Domain**: sql
- **Topic**: window_functions
- **Difficulty**: hard

### Common Window Functions
- `ROW_NUMBER()`: Assigns a unique sequential integer to each row within a partition.
- `RANK()`: Assigns rank with gaps for ties.
- `DENSE_RANK()`: Assigns rank without gaps for ties.
- `LAG(col, offset)` & `LEAD(col, offset)`: Accesses data from previous or subsequent rows without requiring self-joins.

```sql
SELECT 
    employee_id,
    department_id,
    salary,
    DENSE_RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) as salary_rank
FROM employees;
```
