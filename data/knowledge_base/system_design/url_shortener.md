# URL Shortener Architecture

Designing a URL shortener like Bitly requires managing a massive read-to-write ratio (often 100:1) and preventing collision. 

The core of the system is the alias generation. 
- Using **Base62 Encoding** (A-Z, a-z, 0-9) allows for extremely compact URLs. A 7-character Base62 string can support ~3.5 trillion URLs.
- Instead of calculating hashes on the fly and risking collisions, a **Key Generation Service (KGS)** is typically used. The KGS pre-generates unique random keys and stores them in a database, handing them out when a new URL is shortened.

For data storage, a NoSQL database or an RDBMS with efficient indexing on the shortened alias is required.
Because it is read-heavy, a caching layer (like Redis) is essential. When a user requests a short URL, the system checks the cache first. If it's a miss, it queries the database and updates the cache. Rate limiting should also be implemented to prevent malicious scraping or abuse.
