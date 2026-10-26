# Horizontal and Vertical Scaling

## Vertical Scaling (Scale Up)
Increase the resources of a single server: more RAM, CPU, storage, etc.
- **Pro:** simple, no code changes needed.
- **Con:** there is a hardware limit, and the single server is still a single point of failure.

## Horizontal Scaling (Scale Out)
Add more servers (machines) and use a **load balancer** to spread the traffic across them.
- **Pro:** can grow almost without limit, and if one server fails the others keep working.
- **Con:** more complex (load balancing, keeping data in sync across servers).
