# Chat System Architecture

Designing a massive real-time chat system like WhatsApp or Messenger requires handling millions of concurrent connections.

- **Real-time Communication**: WebSockets are the preferred protocol for bi-directional communication, allowing the server to push messages to clients instantly. Long polling can be used as a fallback for older clients.
- **Message Delivery**: When a user sends a message, it typically goes to a Message Queue (like Kafka or RabbitMQ) to decouple ingestion from delivery. This ensures no message is dropped during peak loads.
- **Database Storage**: Chat history requires a datastore optimized for high write throughput and sequential reads. Wide-column stores like Cassandra or HBase are industry standards for this.
- **Presence Service**: A separate microservice using Redis or Zookeeper tracks whether users are online, offline, or typing.

When a user is offline, push notifications (APNs for iOS, FCM for Android) are used to wake up the device and deliver the message. Reliability and consistency are paramount.
