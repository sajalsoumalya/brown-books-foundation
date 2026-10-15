#!/usr/bin/env python3
"""Export live data for the Brown Books site.

Writes two static files the browser reads (the page token never leaves the server):
  posts.json  – top 5 recent posts, ranked by engagement then recency
  stats.json  – real follower count and recent post activity

Run on a schedule (cron) or before each deploy.
"""
import json, re, urllib.request, urllib.error
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ENV = Path("/root/workspace/.env")
TOP_N = 5
FETCH = 30  # recent posts to rank from

def load_env():
    env = {}
    for line in ENV.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^([A-Z_]+)=(.*)$", line.strip())
        if m:
            env[m.group(1)] = m.group(2).strip('"').strip("'")
    return env

def get(url):
    try:
        return json.load(urllib.request.urlopen(url, timeout=20))
    except urllib.error.HTTPError as e:
        raise SystemExit(f"Graph API error {e.code}: {e.read().decode()[:200]}")

def main():
    env = load_env()
    tok, page = env["BBF_PAGE_ACCESS_TOKEN"], env["BBF_PAGE_ID"]
    now = datetime.now(timezone.utc)

    # Page stats
    info = get(f"https://graph.facebook.com/v19.0/{page}?fields=followers_count,fan_count&access_token={tok}")
    followers = info.get("followers_count", info.get("fan_count"))

    # Recent posts with engagement counts
    fields = ("id,created_time,message,permalink_url,"
              "reactions.summary(true).limit(0),comments.summary(true).limit(0),shares")
    posts = get(f"https://graph.facebook.com/v19.0/{page}/posts?limit={FETCH}&fields={fields}&access_token={tok}").get("data", [])

    ranked = []
    for p in posts:
        msg = (p.get("message") or "").strip()
        if not msg:
            continue
        reacts = p.get("reactions", {}).get("summary", {}).get("total_count", 0)
        comments = p.get("comments", {}).get("summary", {}).get("total_count", 0)
        shares = p.get("shares", {}).get("count", 0)
        ranked.append({
            "id": p["id"],
            "time": p.get("created_time", ""),
            "text": msg[:320],
            "url": p.get("permalink_url") or f"https://www.facebook.com/{p['id']}",
            "reactions": reacts, "comments": comments, "shares": shares,
            "score": reacts + 2 * comments + 3 * shares,
        })
    ranked.sort(key=lambda r: (r["score"], r["time"]), reverse=True)  # engagement, then newest
    top = ranked[:TOP_N]

    week_ago = now - timedelta(days=7)
    posts_7d = sum(1 for p in ranked if p["time"] and datetime.fromisoformat(p["time"].replace("+0000", "+00:00")) >= week_ago)

    stamp = now.isoformat(timespec="seconds")
    (ROOT / "posts.json").write_text(json.dumps(
        {"generated": stamp, "rule": "top 5 by engagement (reactions + 2×comments + 3×shares), newest first on ties", "posts": top},
        ensure_ascii=False, indent=2), encoding="utf-8")
    (ROOT / "stats.json").write_text(json.dumps(
        {"generated": stamp, "followers": followers, "posts_last_7_days": posts_7d, "recent_posts_checked": len(ranked)},
        ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"posts.json: {len(top)} posts | stats.json: followers={followers}, posts_7d={posts_7d}")

if __name__ == "__main__":
    main()
