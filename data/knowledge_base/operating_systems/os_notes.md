# Operating Systems Knowledge Base

## Topic: Process Synchronization & Concurrency
- **Domain**: operating_systems
- **Topic**: process_synchronization
- **Difficulty**: hard

### Concepts
Process synchronization coordinates concurrent execution of cooperative processes to prevent race conditions and maintain data consistency when accessing shared system resources.

### Synchronization Primitives
1. **Mutex (Mutual Exclusion)**: A locking mechanism where only one thread holding the lock can access the critical section at a time.
2. **Semaphores**: An integer variable used for signaling. Counting semaphores allow $N$ concurrent threads; binary semaphores act like mutex locks.
3. **Monitors**: High-level language constructs encapsulating shared variables, procedure calls, and condition variables.

---

## Topic: Virtual Memory Management
- **Domain**: operating_systems
- **Topic**: virtual_memory
- **Difficulty**: medium

### Concepts
Virtual memory decouples logical memory address space from physical RAM, enabling processes to execute using more virtual address space than physical memory available.

### Paging & Page Faults
- **Paging**: Memory management scheme dividing physical memory into fixed-size frames and logical memory into pages.
- **Page Fault**: Hardware interrupt triggered when a process references a page not present in physical RAM, forcing the OS kernel to page in data from secondary disk storage.
