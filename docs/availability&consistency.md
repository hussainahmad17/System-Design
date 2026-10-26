# Availability and Consistency

## Availability
Availability is the ability of a system to stay up and respond to requests all the time.
Example: google.com is almost always available and responds.

### How to Improve Availability
1. Moving from a monolith to microservices, so one failing service does not take down the whole app.
2. Using redundancy and replication.
3. Improving fault tolerance (the system keeps working when parts of it fail).

## Consistency
Consistency is the ability of a system to show the latest, updated data to all users.
It ensures that all clients get the same data, no matter which node or server they query.
