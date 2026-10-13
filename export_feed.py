#!/usr/bin/env python3
"""Export recent Brown Books posts to bbf-site/posts.json.

The page token stays on the server; the site only reads the static JSON.
Run it on a schedule (or before each deploy) to refresh the feed.
Posts without text are skipped. Output is capped at 12 items.
"""
import json, os, re, urllib.request, urllib.error
from datetime import datetime, timezone

ENV = "/root/workspace/.env"
OUT = "/root/workspace/bbf-site/posts.json"
LIMIT = 12

def load_env():
    env = {}
    for line in open(ENV, encoding="utf-8"):
        m = re.match(r'^([A-Z_]+)=(.*)$', line.strip())
        if m:
            env[m.group(1)] = m.group(2).strip('"').strip("'")
    return env

def main():
    env = load_env()
    tok, page = env["BBF_PAGE_ACCESS_TOKEN"], env["BBF_PAGE_ID"]
    url = (f"https://graph.facebook.com/v19.0/{page}/posts"
           f"?limit={LIMIT}&fields=id,created_time,message,permalink_url&access_token={tok}")
    try:
        data = json.load(urllib.request.urlopen(url, timeout=20)).get("data", [])
    except urllib.error.HTTPError as e:
        raise SystemExit(f"Graph API error {e.code}: {e.read().decode()[:200]}")

    items = []
    for p in data:
        msg = (p.get("message") or "").strip()
        if not msg:
            continue
        items.append({
            "id": p["id"],
            "time": p.get("created_time", ""),
            "text": msg[:400],
            "url": p.get("permalink_url") or f"https://www.facebook.com/{p['id']}",
        })

    out = {"generated": datetime.now(timezone.utc).isoformat(timespec="seconds"), "posts": items}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"wrote {len(items)} posts to {OUT}")

if __name__ == "__main__":
    main()
