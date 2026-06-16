---
name: restartapp
description: Restart the Mug & Bean local dev server on port 8000 (stop then start). Use when the user types /restartapp or asks to restart, reboot, or reload the app.
---

# Restart the app

Cycle the Next.js dev server on **port 8000**.

1. **Stop the current server.** Use the **PowerShell tool**:
   `Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }`
2. **Clear the pause flag** so it's allowed to come back up:
   `rm -f .claude/.devserver-paused`
3. **Start it again** with the **Bash tool using `run_in_background: true`**:
   `npm run dev`
4. **Wait until it answers:**
   `curl -s -o /dev/null -w "HTTP %{http_code}\n" --retry 15 --retry-delay 2 --retry-all-errors http://localhost:8000`
5. Once you see `HTTP 200`, confirm the app is back at
   **http://localhost:8000**.
