# Database Management Systems (DBMS) Knowledge Base

## Topic: Database Normalization
- **Domain**: dbms
- **Topic**: normalization
- **Difficulty**: medium

### Concepts
Normalization is the process of organizing data in a relational database to minimize data redundancy and prevent data modification anomalies (insertion, update, and deletion anomalies).

### Normal Forms
1. **First Normal Form (1NF)**: Requires atomic column values and unique column names without repeating groups.
2. **Second Normal Form (2NF)**: Meets 1NF and requires that all non-key attributes are fully functionally dependent on the primary key.
3. **Third Normal Form (3NF)**: Meets 2NF and requires no transitive dependencies (non-key attributes depending on other non-key attributes).
4. **Boyce-Codd Normal Form (BCNF)**: A stricter variant of 3NF where for every functional dependency $X \rightarrow Y$, $X$ must be a super key.

### Denormalization
Denormalization is intentionally introducing redundancy into a database schema to improve read query performance, typically in OLAP (analytical) environments or high-throughput reporting data warehouses.

---

## Topic: ACID Properties & Transactions
- **Domain**: dbms
- **Topic**: acid_transactions
- **Difficulty**: hard

### Guarantees
- **Atomicity**: All operations in a transaction execute completely, or none at all (all-or-nothing).
- **Consistency**: Transactions transition the database from one valid state to another, upholding all constraints.
- **Isolation**: Concurrent transaction execution yields identical results to executing transactions sequentially.
- **Durability**: Committed transaction changes persist permanently, even through system crashes.
