# Monolithic Architecture

## What is a Monolith?
A monolithic architecture has a **single codebase**: all services and modules live in the same codebase (the same repo).
The whole app is built and deployed as **one unit** (on one server).

## Pros
- Simple to build, test, and deploy at the start.

## Cons
- A small change requires redeploying the whole app.
- One bug can crash the whole system.
- You must scale the whole app, even if only one part is busy.
