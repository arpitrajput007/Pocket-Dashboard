#!/usr/bin/env python3
"""
Adds content session persistence to Content Studio (kima-bd-os).

Creates:
  supabase/add-content-sessions.sql
  app/api/content-sessions/route.ts

Modifies:
  app/(dashboard)/content/page.tsx
    - Adds ContentSession type + state
    - Auto-saves every generation to DB (non-blocking)
    - Adds History tab that lists past sessions
    - Clicking a session restores content without regenerating
"""
import os, sys, json, base64, urllib.request, urllib.parse, urllib.error

TOKEN = (
    os.environ.get("GITHUB_TOKEN")
    or os.environ.get("GH_TOKEN")
    or os.environ.get("GITHUB_PAT")
)
if not TOKEN:
    sys.exit("ERROR: set GITHUB_TOKEN / GH_TOKEN / GITHUB_PAT")
print("Token ok:", TOKEN[:4] + "****")

REPO = "arpitrajput007/kima-bd-os"

# ─────────────────────────────────────────────────────────────────────────────
SQL_MIGRATION = """\
create table if not exists content_sessions (
  id               uuid        primary key default gen_random_uuid(),
  url              text,
  news             text,
  incident_summary text,
  root_cause       text,
  kima_angle       text,
  tweets           jsonb,
  thread           jsonb,
  linkedin         jsonb,
  created_at       timestamptz default now()
);

create index if not exists content_sessions_created_at_idx
  on content_sessions (created_at desc);

alter table content_sessions enable row level security;
create policy "allow all" on content_sessions
  for all using (true) with check (true);
"""

API_ROUTE = """\
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

export async function GET() {
  const { data, error } = await supabase()
    .from('content_sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sessions: data })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { url, news, incident_summary, root_cause, kima_angle, tweets, thread, linkedin } = body
  const { data, error } = await supabase()
    .from('content_sessions')
    .insert({ url, news, incident_summary, root_cause, kima_angle, tweets, thread, linkedin })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ session: data })
}
"""

HISTORY_VIEW = """\

      {/* ── History ── */}
      {view === 'history' && (
        <div className="p-8">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ color: 'white', fontSize: 16, fontWeight: 700 }}>Generation History</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>
                Click any session to restore — no credits spent
              </div>
            </div>
            <button
              onClick={loadSessions}
              style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' }}
            >
              Refresh
            </button>
          </div>

          {sessionsLoading ? (
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', padding: 48 }}>
              Loading…
            </div>
          ) : sessions.length === 0 ? (
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', padding: 64 }}>
              No sessions yet — generate content and it will appear here automatically
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    if (s.url)  setUrl(s.url)
                    if (s.news) setNews(s.news)
                    setResult({
                      incident_summary: s.incident_summary ?? '',
                      root_cause:       s.root_cause       ?? '',
                      kima_angle:       s.kima_angle        ?? '',
                      tweets:           (s.tweets   as ContentPost[]) ?? [],
                      thread:           (s.thread   as ContentPost[]) ?? [],
                      linkedin:         (s.linkedin as ContentPost[]) ?? [],
                    })
                    setSavedMap({})
                    setGraphicStates({})
                    setTab('tweets')
                    setView('create')
                    toast.success('Session restored')
                  }}
                  style={{
                    width: '100%', textAlign: 'left',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 12, padding: '14px 16px',
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: 'white', fontSize: 13, fontWeight: 600, marginBottom: 4,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.incident_summary
                          ? s.incident_summary.slice(0, 100)
                          : (s.url || s.news || 'Untitled session')}
                      </div>
                      {s.root_cause && (
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.root_cause.slice(0, 90)}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
                        {timeAgo(s.created_at)}
                      </div>
                      <div style={{ display: 'flex', gap: 5 }}>
                        {(s.tweets   as ContentPost[] | null)?.length   ? <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, background: 'rgba(59,130,246,0.15)',  color: 'rgba(147,197,253,0.8)' }}>{(s.tweets as ContentPost[]).length}t</span>   : null}
                        {(s.thread   as ContentPost[] | null)?.length   ? <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, background: 'rgba(99,102,241,0.15)',  color: 'rgba(165,180,252,0.8)' }}>{(s.thread as ContentPost[]).length}th</span>  : null}
                        {(s.linkedin as ContentPost[] | null)?.length   ? <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, background: 'rgba(14,165,233,0.15)',  color: 'rgba(125,211,252,0.8)' }}>{(s.linkedin as ContentPost[]).length}li</span> : null}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}\
"""

# ─────────────────────────────────────────────────────────────────────────────
def api(method, path, data=None):
    url = "https://api.github.com" + path
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, method=method,
        headers={
            "Authorization": "Bearer " + TOKEN,
            "Content-Type":  "application/json",
            "Accept":        "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        })
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code}: {e.read().decode()[:400]}")

def fetch(path):
    ep = urllib.parse.quote(path, safe="")
    d  = api("GET", f"/repos/{REPO}/contents/{ep}")
    return base64.b64decode(d["content"].replace("\n", "")).decode(), d["sha"]

def exists(path):
    try:
        fetch(path)
        return True
    except Exception:
        return False

def push(path, content, sha, msg):
    ep   = urllib.parse.quote(path, safe="")
    body = {"message": msg, "content": base64.b64encode(content.encode()).decode()}
    if sha:
        body["sha"] = sha
    r = api("PUT", f"/repos/{REPO}/contents/{ep}", body)
    return r["commit"]["sha"]

def apply_change(content, old, new, label):
    if old not in content:
        print(f"  [WARN] anchor not found: {label}")
        return content
    if new in content:
        print(f"  [SKIP] already applied: {label}")
        return content
    print(f"  [OK]   {label}")
    return content.replace(old, new, 1)

# ─────────────────────────────────────────────────────────────────────────────
# 1. SQL migration
print("\n==> supabase/add-content-sessions.sql")
path = "supabase/add-content-sessions.sql"
if exists(path):
    print("  [SKIP] already exists")
else:
    sha = push(path, SQL_MIGRATION, None, "Add content_sessions table migration")
    print(f"  [OK]   created  {sha}")

# 2. API route
print("\n==> app/api/content-sessions/route.ts")
path = "app/api/content-sessions/route.ts"
if exists(path):
    print("  [SKIP] already exists")
else:
    sha = push(path, API_ROUTE, None, "Add /api/content-sessions route")
    print(f"  [OK]   created  {sha}")

# 3. page.tsx
print("\n==> app/(dashboard)/content/page.tsx")
content, sha = fetch("app/(dashboard)/content/page.tsx")
print(f"  fetched {len(content)} chars  sha={sha[:8]}")

if "content_sessions" in content:
    print("  [SKIP] session feature already present")
else:
    content = apply_change(content,
        "type PageView   = 'create' | 'saved'",
        "type PageView   = 'create' | 'saved' | 'history'",
        "PageView type")

    content = apply_change(content,
        "interface ContentDraft {",
        """\
interface ContentSession {
  id: string
  url: string | null
  news: string | null
  incident_summary: string | null
  root_cause: string | null
  kima_angle: string | null
  tweets: unknown
  thread: unknown
  linkedin: unknown
  created_at: string
}

interface ContentDraft {""",
        "ContentSession interface")

    content = apply_change(content,
        "const [showPosted, setShowPosted]   = useState(false)",
        """\
const [showPosted, setShowPosted]   = useState(false)
  const [sessions, setSessions]               = useState<ContentSession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)""",
        "sessions state")

    content = apply_change(content,
        "const loadDrafts = useCallback(async () => {",
        """\
const loadSessions = useCallback(async () => {
    setSessionsLoading(true)
    try {
      const res  = await fetch('/api/content-sessions')
      const json = await res.json()
      setSessions(json.sessions || [])
    } catch { /* silent */ }
    finally  { setSessionsLoading(false) }
  }, [])

  const loadDrafts = useCallback(async () => {""",
        "loadSessions function")

    content = apply_change(content,
        "    setResult(json.data)\n    toast.success('Content generated')",
        """\
    setResult(json.data)
    toast.success('Content generated')
    fetch('/api/content-sessions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.trim() || undefined, news: news.trim() || undefined, ...json.data }),
    }).catch(() => { /* non-blocking */ })""",
        "auto-save session after generation")

    content = apply_change(content,
        "] as { key: PageView; label: string }[])",
        """\
  { key: 'history', label: 'History' },
] as { key: PageView; label: string }[])\
""",
        "History tab")

    content = apply_change(content,
        "useEffect(() => { loadDrafts() }, [loadDrafts])",
        """\
useEffect(() => { loadDrafts() }, [loadDrafts])
  useEffect(() => { if (view === 'history') loadSessions() }, [view, loadSessions])""",
        "sessions useEffect")

    content = apply_change(content,
        "      )}\n    </div>\n  )\n}",
        HISTORY_VIEW + "\n      )}\n    </div>\n  )\n}",
        "History view JSX")

    commit = push("app/(dashboard)/content/page.tsx", content, sha,
                  "Add session history to Content Studio — auto-save every generation, restore with one click")
    print(f"  committed  {commit}")

print("\nDone.")
