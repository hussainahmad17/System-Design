# REST API

## What is an API?
An API (Application Programming Interface) is the bridge that lets a client and a server talk to each other.
The client sends a request, and the server sends back a response, both through the API.

## What is a REST API?
A REST API is an API that follows the **REST** (Representational State Transfer) principles.

## REST Principles
1. **Client-Server:** the client (UI) and the server (data and logic) are separate and can change independently.
2. **Stateless:** each request carries all the information needed to handle it; the server does not store session state between requests.
3. **Cacheable:** responses say whether they can be cached, so clients can reuse them.
4. **Uniform Interface:** resources are identified by URLs (e.g. `/users/1`) and handled with standard HTTP methods.
5. **Layered System:** the client does not need to know whether it talks to the real server or to a load balancer, cache, or proxy in between.

## Common Practices
- **HTTP methods:** `GET` (read), `POST` (create), `PUT`/`PATCH` (update), `DELETE` (delete).
- **JSON format:** language-independent and lightweight, so any client can read it. (REST does not require JSON, but it is the most common format.)
