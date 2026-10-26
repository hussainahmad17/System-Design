# HLD - High Level Design

## What is HLD?
HLD shows the big picture of a system:
- The main components
- How they talk to each other
- How data flows between them

It comes after gathering requirements and before LLD (Low Level Design).

## Goal
Design a system that is scalable, available, and reliable for millions of users.

## Key Decisions
- **Tech stack:** languages, frameworks
- **Architecture style:** monolith or microservices
- **Database:** SQL or NoSQL (use the CAP Theorem to guide the trade-off)
- **Load balancing:** spread traffic across servers
- **Caching:** keep hot data close to reduce DB load
- **Message queues:** handle async tasks
- **CDN:** serve static files fast

## HLD vs LLD
| HLD | LLD |
|---|---|
| Big picture | Inner details |
| Components and flow | Classes, methods, schemas |
| For architects | For developers |
