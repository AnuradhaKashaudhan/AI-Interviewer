from typing import Dict, Any

SYSTEM_DESIGN_TOPICS: Dict[str, Dict[str, Any]] = {
    "url_shortener": {
        "title": "URL Shortener",
        "difficulty": "intermediate",
        "problem_statement": "Design a highly scalable URL shortening service like Bitly.",
        "functional_requirements": [
            "Given a long URL, the service should generate a shorter and unique alias.",
            "When users access a short link, they should be redirected to the original link.",
            "Users should optionally be able to specify a custom alias.",
            "Links expire after a standard default timespan."
        ],
        "non_functional_requirements": [
            "The system must be highly available.",
            "URL redirection should happen in real-time with minimal latency.",
            "Shortened links should not be predictable."
        ],
        "expected_concepts": [
            "Base62 Encoding",
            "Key Generation Service (KGS)",
            "Database Indexing",
            "Caching (Redis)",
            "Rate Limiting"
        ],
        "evaluation_criteria": [
            "Did the candidate correctly identify the read-heavy nature of the system (100:1 read-to-write ratio)?",
            "Did they choose an appropriate datastore (e.g., NoSQL or RDBMS with proper indexing)?",
            "Did they address collision prevention during alias generation?",
            "Did they include a caching layer for high-throughput redirection?"
        ]
    },
    "chat_system": {
        "title": "Chat System",
        "difficulty": "advanced",
        "problem_statement": "Design a global chat system like WhatsApp or Messenger.",
        "functional_requirements": [
            "Support 1-on-1 chatting with low delivery latency.",
            "Support group chats (up to 100 people).",
            "Online presence indicator.",
            "Message history persistence across multiple devices."
        ],
        "non_functional_requirements": [
            "System must handle 500 million Daily Active Users (DAU).",
            "Real-time message delivery.",
            "Highly reliable; no message loss.",
            "Scalable to handle viral events."
        ],
        "expected_concepts": [
            "WebSockets",
            "Message Queues (Kafka/RabbitMQ)",
            "Key-Value Store (Cassandra/HBase) for history",
            "Presence Service",
            "Push Notifications"
        ],
        "evaluation_criteria": [
            "Did they propose WebSockets or Long Polling for real-time delivery?",
            "Did they decouple message ingestion from delivery using a message queue?",
            "Did they handle offline users gracefully?",
            "Did they identify a suitable datastore for high-write message logging?"
        ]
    },
    "rate_limiter": {
        "title": "API Rate Limiter",
        "difficulty": "beginner",
        "problem_statement": "Design a distributed API Rate Limiter to protect services from being overwhelmed.",
        "functional_requirements": [
            "Limit the number of requests a user can send to an API within a time window.",
            "Support different rules (e.g., 5 req/sec for Free tier, 100 req/sec for Pro tier).",
            "Return 429 Too Many Requests when limits are exceeded."
        ],
        "non_functional_requirements": [
            "Must be highly available.",
            "Must be extremely fast (low latency injection into the request path).",
            "Should not consume excessive memory."
        ],
        "expected_concepts": [
            "Token Bucket / Leaky Bucket Algorithms",
            "Fixed Window / Sliding Window Log / Sliding Window Counter",
            "Redis / In-memory Datastore",
            "Race Conditions handling in distributed environment"
        ],
        "evaluation_criteria": [
            "Did they mention the Token Bucket or Sliding Window algorithms?",
            "Did they explain how to store the counters efficiently (e.g., Redis)?",
            "Did they identify issues with race conditions and propose solutions (e.g., Lua scripts)?",
            "Where did they place the rate limiter in the architecture (e.g., API Gateway)?"
        ]
    }
}
