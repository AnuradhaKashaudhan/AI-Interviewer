# Python Programming Language Knowledge Base

## Topic: Python Memory Management & GIL
- **Domain**: python
- **Topic**: memory_management
- **Difficulty**: hard

### Concepts
Python handles memory allocation automatically via a private heap containing all Python objects and data structures. The CPython interpreter uses reference counting combined with a generational cyclic garbage collector to detect and reclaim unreachable object reference cycles.

### Global Interpreter Lock (GIL)
The GIL is a mutex lock used by CPython to prevent multiple native OS threads from executing Python bytecode simultaneously, preserving thread safety around non-thread-safe reference counting.

---

## Topic: Generators & Iterators
- **Domain**: python
- **Topic**: generators
- **Difficulty**: medium

### Yield Keyword & Lazy Evaluation
Generators are special functions returning iterator objects using the `yield` keyword. Unlike standard functions that execute and return a complete array in memory, generators yield items lazily one at a time, allowing processing of arbitrarily large files or streams with $O(1)$ memory consumption.
