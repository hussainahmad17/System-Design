# Latency and Throughput

## Latency
Latency is the time between sending a request and getting the response.
Example: when you type facebook.com, the time from sending the request until the Facebook home page comes back is the latency.

### How to Reduce Latency
1. **Caching:** store frequently requested data in fast memory.
2. **CDN:** serve static content (images, videos, CSS, JS) from a server close to the user.
3. **Hardware and server upgrades:** faster CPUs, more RAM, SSDs.

## Throughput
Throughput is the amount of work a system completes per unit of time (e.g. requests per second).

### How to Increase Throughput
1. **Microservices:** scale busy services independently.
2. **Load balancers:** spread requests across many servers (horizontal scaling).
3. **Caching:** each request finishes faster, so more requests can be handled.
4. **CDN:** takes static-content traffic off the main servers.
