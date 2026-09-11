# React & Frontend Architecture

## Topic: Virtual DOM & React Fiber Reconciliation
- **Domain**: react
- **Topic**: virtual_dom_fiber
- **Difficulty**: medium

### Virtual DOM Architecture
- React creates a lightweight in-memory snapshot of the UI DOM tree.
- When state or props change, a new Virtual DOM tree is constructed.
- React compares the new Virtual DOM with the previous Virtual DOM using a heuristic $O(n)$ diffing algorithm.

### React Fiber Architecture
- Introduced in React 16 to break rendering work into incremental units of work.
- Allows React to pause, resume, or abort rendering priority for high-priority user input and animations.

---

## Topic: React Hooks & State Management
- **Domain**: react
- **Topic**: hooks_and_state
- **Difficulty**: hard

### Core Hooks Rules
- Call hooks only at the top level of React functions (never inside loops, conditions, or nested functions).
- Call hooks only from React function components or custom hooks.

### Performance Optimization Hooks
- **`useMemo`**: Caches calculated values across renders to avoid expensive re-computations.
- **`useCallback`**: Caches callback function references across renders to prevent unnecessary re-renders of child components wrapped in `React.memo`.

```javascript
const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b]);
const memoizedCallback = useCallback(() => { doSomething(a, b); }, [a, b]);
```
