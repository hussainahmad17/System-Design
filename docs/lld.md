# LLD - Low Level Design

## What is LLD?
LLD shows the inner details of each component:
- The classes and their methods
- How classes relate to each other
- The data structures and database schemas

It comes after HLD and right before writing the code.

## Goal
Design code that is clean, easy to change, easy to test, and easy to reuse.

## Key Decisions
- **Classes and objects:** what each class does and what data it holds
- **Relationships:** inheritance, composition, association
- **Interfaces:** define contracts so parts can be swapped
- **Design patterns:** Singleton, Factory, Strategy, Observer, and more
- **SOLID principles:** guide how to split and connect classes
- **Database schema:** tables, columns, keys, indexes
- **API contracts:** request and response format for each endpoint
- **Error handling:** how failures are caught and reported

## Common Diagrams
- **Class diagram:** classes and their relationships
- **Sequence diagram:** the order of calls between objects
- **ER diagram:** tables and how they link

## LLD vs HLD
| LLD | HLD |
|---|---|
| Inner details | Big picture |
| Classes, methods, schemas | Components and flow |
| For developers | For architects |
