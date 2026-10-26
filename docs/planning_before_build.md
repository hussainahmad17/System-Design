# Planning Before Building

Before building anything, we need to plan the app.
Plan these major things first:

1. **Features (requirements):**
   - **Functional:** what the system does (e.g. shorten a URL, redirect to the original URL).
   - **Non-functional:** how well it does it (e.g. speed, availability, security).
2. **Capacity estimation:** estimate traffic, storage, memory, and CPU needs.
3. **Design goals:** decide which qualities matter most, including the CAP trade-off (consistency vs availability).
   For example, a URL shortener should be:
   - Read-heavy (optimized for many more reads than writes)
   - Highly available
   - Low latency
   - Secure
4. **HLD (High Level Design):** APIs, database, algorithms, and the overall design.
