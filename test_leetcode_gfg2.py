import httpx
import asyncio
import json
import re

async def test_gfg_profile_chunk():
    """Find and search the GFG profile-specific JS chunk"""
    
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        # Fetch the profile page JS chunk directly - this is the profile [username] page chunk
        r = await client.get(
            "https://www.geeksforgeeks.org/user/manaschhabra22/",
            headers={"User-Agent": "Mozilla/5.0", "Accept": "text/html"},
        )
        html = r.text
        
        # Find JS files with 'profile' in the name
        profile_chunks = re.findall(r'https://assets[^"\']*(?:profile|user)[^"\']*\.js', html)
        print(f"Profile-related chunks: {profile_chunks}")
        
        # Check the page JS app bundles specifically
        # These contain the page-specific fetch calls
        page_chunks = [u for u in re.findall(r'https://assets[^"\']*\.js', html) 
                      if any(x in u for x in ['page', 'profile', 'user', 'layout'])]
        print(f"\nPage chunks: {page_chunks}")
        
        # Fetch ALL chunks and search for authapi AND practiceapi paths more broadly
        all_chunk_urls = list(set(re.findall(r'https://assets\.geeksforgeeks\.org[^"\']*\.js', html)))
        
        for url in all_chunk_urls:
            try:
                resp = await client.get(url, timeout=8)
                js = resp.text
                
                # Check for practice-stats, coding-score, user-info etc.
                targets = ['practice-stats', 'coding-score', 'score-card', 'user-info', 'user/profile', 
                          'problems-solved', 'streak', 'getAnyUser', 'getPublicProfile']
                
                hits = [t for t in targets if t.lower() in js.lower()]
                if hits:
                    chunk_name = url.split('/')[-1]
                    print(f"\n*** {chunk_name} has: {hits}")
                    
                    for target in hits:
                        idx = js.lower().find(target.lower())
                        if idx >= 0:
                            snippet = js[max(0,idx-200):idx+400]
                            # Clean for display
                            clean = snippet.replace('\n', ' ')
                            print(f"  [{target}]: ...{clean[:400]}...")
                        
            except Exception as e:
                pass

asyncio.run(test_gfg_profile_chunk())
