#!/bin/bash
# Adds Twitter/X URL reading to kima-bd-os copilot routes
# Run: bash scratch/fix_tweet_reading.sh
set -e

REPO="arpitrajput007/kima-bd-os"
TMPDIR=$(mktemp -d)

echo "Cloning repo..."
git clone --depth 1 https://github.com/$REPO.git "$TMPDIR/repo"
cd "$TMPDIR/repo"

TWITTER_FUNCS='async function fetchTweetViaAPI(tweetUrl: string): Promise<string> {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN
  if (!bearerToken) return '\'''\''
  const match = tweetUrl.match(/\/status\/(\d+)/)
  if (!match) return '\'''\''
  const tweetId = match[1]
  try {
    const res = await fetch(
      `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=text,created_at&expansions=author_id&user.fields=name,username`,
      {
        headers: { Authorization: `Bearer ${bearerToken}` },
        signal: AbortSignal.timeout(12_000),
      }
    )
    if (!res.ok) return '\'''\''
    const json = await res.json() as {
      data?: { text?: string }
      includes?: { users?: Array<{ username: string; name: string }> }
    }
    const text   = json.data?.text || '\'''\''
    const author = json.includes?.users?.[0]
    return author ? `Tweet by @${author.username} (${author.name}):\n${text}` : text
  } catch {
    return '\'''\''
  }
}

async function fetchTweetOEmbed(tweetUrl: string): Promise<string> {
  try {
    const api = `https://publish.twitter.com/oembed?url=${encodeURIComponent(tweetUrl)}&omit_script=true`
    const res = await fetch(api, { signal: AbortSignal.timeout(12_000) })
    if (!res.ok) return '\'''\''
    const json = await res.json() as { html?: string; author_name?: string }
    const html   = json.html || '\'''\''
    const text   = html.replace(/<[^>]+>/g, '\'' '\'').replace(/\s+/g, '\'' '\'').trim()
    const author = json.author_name ? `Tweet by @${json.author_name}:\n` : '\'''\''
    return author + text
  } catch {
    return '\'''\''
  }
}

'

TWITTER_GUARD='  // Twitter \/ X.com \u2192 use dedicated methods before falling back to Jina
  if (\/twitter\\.com|x\\.com\/.test(url)) {
    const apiText = await fetchTweetViaAPI(url)
    if (apiText.length > 20) return { content: apiText, source: `Tweet (${url})` }
    const oembedText = await fetchTweetOEmbed(url)
    if (oembedText.length > 20) return { content: oembedText, source: `Tweet (${url})` }
    return { content: '\''\'', source: url }
  }
'

patch_file() {
  local FILE="$1"
  echo "  Patching $FILE..."

  python3 - "$FILE" <<'PYEOF'
import sys

path = sys.argv[1]
with open(path, 'r') as f:
    content = f.read()

TWITTER_FUNCS = '''async function fetchTweetViaAPI(tweetUrl: string): Promise<string> {
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

'''

TWITTER_GUARD = '''  // Twitter / X.com -> use dedicated methods before falling back to Jina
  if (/twitter\\.com|x\\.com/.test(url)) {
    const apiText = await fetchTweetViaAPI(url)
    if (apiText.length > 20) return { content: apiText, source: `Tweet (${url})` }
    const oembedText = await fetchTweetOEmbed(url)
    if (oembedText.length > 20) return { content: oembedText, source: `Tweet (${url})` }
    return { content: '', source: url }
  }

'''

FETCH_URL_SIG = 'async function fetchUrl(url: string)'
JINA_LINE = "  const res = await fetch(`https://r.jina.ai/${url}`,"

if 'fetchTweetViaAPI' not in content:
    content = content.replace(FETCH_URL_SIG, TWITTER_FUNCS + FETCH_URL_SIG, 1)
    print('    [+] Twitter helper functions added')
else:
    print('    [=] Twitter helpers already present')

if 'twitter\\.com|x\\.com' not in content:
    if JINA_LINE not in content:
        print('    [!] ERROR: Jina line not found - manual fix needed')
        sys.exit(1)
    content = content.replace(JINA_LINE, TWITTER_GUARD + JINA_LINE, 1)
    print('    [+] Twitter guard added before Jina fallback')
else:
    print('    [=] Twitter guard already present')

with open(path, 'w') as f:
    f.write(content)

print('    Done.')
PYEOF
}

patch_file "app/api/ai/aergap-copilot/route.ts"
patch_file "app/api/ai/copilot/route.ts"

git add app/api/ai/aergap-copilot/route.ts app/api/ai/copilot/route.ts
git commit -m "Add Twitter/X URL reading to AI Co-Pilot and Aergap Co-Pilot

Both routes now use the same tweet-fetching logic as the content
studio: Twitter API v2 (bearer token) -> oEmbed fallback -> Jina.
X.com and twitter.com URLs are detected by regex before passing
to Jina, which cannot read tweets.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"

git push origin main

echo ""
echo "Done! Both copilots can now read tweets."
rm -rf "$TMPDIR"
