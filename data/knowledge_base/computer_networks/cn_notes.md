# Computer Networks & Systems Architecture

## Topic: TCP/IP & Transport Layer Protocols
- **Domain**: computer_networks
- **Topic**: transport_protocols
- **Difficulty**: medium

### TCP vs UDP
- **TCP (Transmission Control Protocol)**: Connection-oriented, reliable protocol providing ordering guarantees, error detection, flow control (sliding window algorithm), and congestion control. Uses a 3-way handshake (`SYN`, `SYN-ACK`, `ACK`) to establish connections and 4-way handshake to terminate.
- **UDP (User Datagram Protocol)**: Connectionless, lightweight protocol without delivery or ordering guarantees. Ideal for real-time video streaming, gaming, and VoIP where low latency is critical.

---

## Topic: HTTP, HTTPS & TLS Handshake
- **Domain**: computer_networks
- **Topic**: application_layer_http
- **Difficulty**: hard

### HTTP Evolution
- **HTTP/1.1**: Introduces persistent connections (`Keep-Alive`), but suffers from Head-of-Line (HoL) blocking.
- **HTTP/2**: Introduces binary framing, multiplexing over a single TCP connection, header compression (HPACK), and server push.
- **HTTP/3**: Uses QUIC protocol over UDP to eliminate TCP Head-of-Line blocking and accelerate connection setup.

### TLS 1.3 Encryption
- Secures HTTP traffic via asymmetric encryption (RSA / Elliptic Curve Diffie-Hellman) during handshake to exchange session keys, followed by symmetric AES-GCM encryption for bulk data transfer.

---

## Topic: DNS & Routing Architecture
- **Domain**: computer_networks
- **Topic**: dns_and_routing
- **Difficulty**: medium

### Domain Name System (DNS) Resolution
1. Client checks local DNS cache / OS resolver.
2. Query sent to Recursive Resolver (ISP or 8.8.8.8).
3. Root Name Server (`.`) returns Top-Level Domain (TLD) server address (`.com`).
4. TLD Server returns Authoritative Name Server address.
5. Authoritative Server returns target IP address (A / AAAA record).
