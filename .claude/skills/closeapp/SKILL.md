---
name: closeapp
description: Stop the Mug & Bean local dev server running on port 8000. Use when the user types /closeapp or asks to stop, close, kill, or shut down the app.
---

# Close the app

Stop whatever is serving on **port 8000** and keep it down.

1. **Set the pause flag first** so the end-of-turn auto-start hook does NOT
   immediately restart it:
   `touch .claude/.devserver-paused`
2. **Kill the process on port 8000.** Use the **PowerShell tool**:
   `Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }`
   (If nothing is listening, this is a no-op — that's fine.)
3. **Confirm it's down:**
   `curl -sf -m 2 -o /dev/null http://localhost:8000` → expect a **non-zero**
   exit code (connection refused).
4. Tell the user the app is stopped. Mention that **/startapp** or
   **/restartapp** brings it back; until then the auto-start hook stays paused.
