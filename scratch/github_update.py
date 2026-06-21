#!/usr/bin/env python3
import os, sys, json, base64, urllib.request, urllib.parse, urllib.error

TOKEN = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_PAT")
if not TOKEN:
    sys.exit("ERROR: No token in GITHUB_TOKEN / GH_TOKEN / GITHUB_PAT")
print("Token ok:", TOKEN[:4] + "****")

TWITTER_FUNCTIONS = """\
async function fetchTweetViaAPI(tweetUrl: string): Promise<string> {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN
  if (!bearerToken) return ''
  const match = tweetUrl.match(/\\/status\\/(\\d+)/)
  if (!match) return ''
  const tweetId = match[1]
  try {
    const res = await fetch(
      `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=text,created_at&expansions=author_id&user.fields=name,username`,
      {
        headers: { Authorization: `Bearer ${bearerToken}` },
        signal: AbortSignal.timeout(12_000),
      }
    )
    if (!res.ok) return ''
    const json = await res.json() as {
      data?: { text?: string }
      includes?: { users?: Array<{ username: string; name: string }> }
    }
    const text   = json.data?.text || ''
    const author = json.includes?.users?.[0]
    return author ? `Tweet by @${author.username} (${author.name}):\\n${text}` : text
  } catch {
    return ''
  }
}

async function fetchTweetOEmbed(tweetUrl: string): Promise<string> {
  try {
    const api = `https://publish.twitter.com/oembed?url=${encodeURIComponent(tweetUrl)}&omit_script=true`
    const res = await fetch(api, { signal: AbortSignal.timeout(12_000) })
    if (!res.ok) return ''
    const json = await res.json() as { html?: string; author_name?: string }
    const html   = json.html || ''
    const text   = html.replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' ').trim()
    const author = json.author_name ? `Tweet by @${json.author_name}:\\n` : ''
    return author + text
  } catch {
    return ''
  }
}

"""

TWITTER_GUARD = """\
  // Twitter / X.com -> use dedicated methods before falling back to Jina
  if (/twitter\\.com|x\\.com/.test(url)) {
    const apiText = await fetchTweetViaAPI(url)
    if (apiText.length > 20) return { content: apiText, source: `Tweet (${url})` }
    const oembedText = await fetchTweetOEmbed(url)
    if (oembedText.length > 20) return { content: oembedText, source: `Tweet (${url})` }
    return { content: '', source: url }
  }

"""

FETCH_URL_SIG = "async function fetchUrl(url: string)"
JINA_LINE = "  const res = await fetch(`https://r.jina.ai/${url}`,"

def api(method, path, data=None):
    url = "https://api.github.com" + path
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, method=method,
        headers={"Authorization": "Bearer " + TOKEN,
                 "Content-Type": "application/json",
                 "Accept": "application/vnd.github+json",
                 "X-GitHub-Api-Version": "2022-11-28"})
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code}: {e.read().decode()}")

def fetch(path):
    ep = urllib.parse.quote(path, safe="")
    d = api("GET", "/repos/arpitrajput007/kima-bd-os/contents/" + ep)
    return base64.b64decode(d["content"].replace("\n","")).decode(), d["sha"]

def modify(content, path):
    if FETCH_URL_SIG not in content:
        raise ValueError("fetchUrl not found in " + path)
    if "fetchTweetViaAPI" not in content:
        content = content.replace(FETCH_URL_SIG, TWITTER_FUNCTIONS + FETCH_URL_SIG, 1)
        print("  [OK] Twitter helper functions inserted")
    else:
        print("  [SKIP] Twitter helpers already present")
    if JINA_LINE not in content:
        raise ValueError("Jina line not found in " + path)
    if "twitter\\.com|x\\.com" not in content:
        content = content.replace(JINA_LINE, TWITTER_GUARD + JINA_LINE, 1)
        print("  [OK] Twitter guard inserted")
    else:
        print("  [SKIP] Twitter guard already present")
    return content

def push(path, content, sha, msg):
    ep = urllib.parse.quote(path, safe="")
    r = api("PUT", "/repos/arpitrajput007/kima-bd-os/contents/" + ep,
            {"message": msg, "sha": sha,
             "content": base64.b64encode(content.encode()).decode()})
    return r["commit"]["sha"]

FILES = [
    ("app/api/ai/aergap-copilot/route.ts", "b09bdfdc8c7c3f071e40aca5326ec7778b9a9ac3", "Add Twitter/X URL reading to Aergap Co-Pilot"),
    ("app/api/ai/copilot/route.ts", "21e2fe3a31408a1bbd9f00bebe5893b1423ad832", "Add Twitter/X URL reading to AI Co-Pilot"),
]

for path, expected_sha, msg in FILES:
    print(f"\n==> {path}")
    content, sha = fetch(path)
    print(f"  Fetched {len(content)} chars  sha={sha}")
    if sha != expected_sha:
        print(f"  NOTE: sha differs from expected ({expected_sha})")
    modified = modify(content, path)
    commit_sha = push(path, modified, sha, msg)
    print(f"  Committed: {commit_sha}")

print("\nDone.")
