---
name: startapp
description: Start the Mug & Bean local dev server on http://localhost:8000. Use when the user types /startapp or asks to start, launch, boot, or run the app.
---

# Start the app

Bring the Next.js dev server up on **port 8000**.

1. **Clear the pause flag** so the end-of-turn auto-start hook won't conflict:
   `rm -f .claude/.devserver-paused`
2. **Check if it's already running:**
   `curl -sf -m 2 -o /dev/null http://localhost:8000`
   - Exit code `0` → it's already up. Tell the user it's already running at
     http://localhost:8000 and stop here.
3. **Start it** (only if step 2 showed it's down). Run `npm run dev` with the
   **Bash tool using `run_in_background: true`** so it keeps running across turns.
   Never run it in the foreground — that would block.
4. **Wait until it answers**, then confirm:
   `curl -s -o /dev/null -w "HTTP %{http_code}\n" --retry 15 --retry-delay 2 --retry-all-errors http://localhost:8000`
5. Once you see `HTTP 200`, tell the user the app is live at
   **http://localhost:8000**.

Note: a `.claude/.devserver-paused` flag (set by `/closeapp`) tells the local
auto-start hook to leave the server down. Removing it in step 1 re-arms that
hook.
