Nginx can be used as a Load Balancer.

What it is:
It spreads requests over multiple instances of the same app.

We create multiple instances of the same codebase by giving them different ports:
-> Set PORT=8000 and run the server. Now it's a Node.js process on port 8000.
-> Set PORT=8001 and run the server again. Now we have two independent processes on different ports (8000/8001).

Config:

```nginx
upstream backend {
    server 127.0.0.1:8000;
    server 127.0.0.1:8001;
}

server {
    listen 80;

    location / {
        proxy_pass http://backend;
    }
}
```

-> upstream defines the group of servers.
-> proxy_pass sends requests to that group. Without it, upstream is not used.
-> Use 127.0.0.1, not localhost. localhost can also resolve to IPv6 (::1) and requests can fail.

Nginx distributes the load using the round-robin method (default).
First request goes to the first server, second goes to the second, third goes to the first again, and so on.

Other methods:
-> weight=3: a stronger server gets more requests
-> least_conn: pick the server with the fewest active connections. Good when some requests are slow.
-> ip_hash: the same client IP always goes to the same server

If a server dies:
-> Nginx stops sending requests to it for some time, then tries it again (max_fails, fail_timeout).
-> If the connection fails, the request goes to the next server.

Important:
-> The app must be stateless (no user data kept in process memory). A session saved on 8000 is unknown to 8001, so the user looks logged out. Keep sessions in Redis/DB or use JWT.
-> Both instances are on the same machine. If the machine dies, everything dies. In production, use different machines.
-> Nginx itself is a single point of failure.
