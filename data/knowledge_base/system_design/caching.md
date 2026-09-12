# Caching

Caching is a critical component for high-throughput system design architecture. Caches like Redis and Memcached store frequently accessed data in memory (RAM), significantly reducing database load and response times.

When designing systems, consider cache invalidation strategies:
- **Write-through cache**: Data is written into the cache and the corresponding database at the same time. Good for consistency.
- **Write-around cache**: Data is written directly to the database, bypassing the cache. Good for data that is not frequently read.
- **Write-back cache**: Data is written only to the cache, and asynchronously written to the database. Very fast but risks data loss on crash.

Common caching layers include CDN caching for static assets, API gateway caching, and database caching.
