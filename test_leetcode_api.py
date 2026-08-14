import httpx
import asyncio
import json
import re

async def extract_full_rsc_data():
    """Extract and parse all RSC data from GFG profile page"""
    user = "rathbhupendra"
    
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        r = await client.get(
            f"https://www.geeksforgeeks.org/user/{user}/",
            headers={"User-Agent": "curl/7.68.0", "Accept": "text/html"}
        )
        html = r.text
        
        # Extract ALL RSC chunks (both the [1,...] and [0,...] format)
        chunks_1 = re.findall(r'self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)', html)
        chunks_0 = re.findall(r'self\.__next_f\.push\(\[0,"((?:[^"\\]|\\.)*)"\]\)', html)
        
        print(f"RSC chunks [1]: {len(chunks_1)}, [0]: {len(chunks_0)}")
        
        # Join and unescape all [1] chunks
        full_rsc = "\n".join(chunks_1)
        
        # Find the chunk that has the mentor/profile data
        for i, chunk in enumerate(chunks_1):
            if 'mentor' in chunk or 'handle' in chunk.lower() or 'rathbhupendra' in chunk:
                print(f"\n=== Relevant chunk {i} ===")
                # Try to unescape
                try:
                    # Convert escaped unicode
                    decoded = chunk.encode('utf-8').decode('unicode_escape')
                except:
                    decoded = chunk
                print(decoded[:2000])
        
        # Also look for score data specifically
        for i, chunk in enumerate(chunks_1):
            lower = chunk.lower()
            if any(kw in lower for kw in ['score', 'solved', 'rank', 'streak', 'practice']):
                print(f"\n=== Score-related chunk {i} ===")
                print(chunk[:1000])

asyncio.run(extract_full_rsc_data())
