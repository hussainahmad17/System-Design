Nginx can be used as a Reverse Proxy.

What it is:
A server that sits in front of the app server.
The client talks to Nginx. Nginx forwards the request to the app.

Client -> Nginx -> App server

Config:

```nginx
server {
    listen 80;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

-> proxy_pass forwards the request to the app.
-> X-Forwarded-For passes the real client IP. Without it, the app sees every request coming from Nginx.

It hides the server from the internet.
-> Only true if the app port (8000) is closed to the public. Otherwise anyone can skip Nginx.

Protect the server by applying:
-> Rate Limiting: limit requests per second per IP (limit_req)
-> Connection Limiting: limit open connections per IP (limit_conn)
-> Request Size Limiting: reject large request bodies (client_max_body_size, default 1 MB)
-> IP Blocking: block or allow specific IPs (allow / deny)
-> Timeout Protection: drop slow clients and slow app responses (client_body_timeout, proxy_read_timeout)
-> HTTP Method Restriction: allow only the methods you need (limit_except)
-> SSL/TLS Management: Nginx handles HTTPS, the app gets plain HTTP (TLS termination)

Also used for:
-> Load balancing (see nginx_as_load_balancer.md)
-> Caching responses
-> Compression (gzip)
-> Serving static files

Trade-off:
-> Nginx is a single point of failure. If it goes down, the whole site is down.
