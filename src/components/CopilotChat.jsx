import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Send, Bot, User, ArrowRight, Plus, Trash2, ChevronDown } from 'lucide-react';

const STORAGE_KEY = 'pocket_copilot_sessions';
const MAX_SESSIONS = 8;

function makeId() { return 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7); }

function loadSessions() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveSessions(sessions) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS))); } catch {}
}

function freshSession(storeName) {
  return {
    id: makeId(),
    title: 'New conversation',
    messages: [{
      role: 'assistant',
      content: `Hi! I'm your Pocket Dashboard AI Co-Pilot. I have real-time access to your store data. What would you like to know about your business today?`,
    }],
    createdAt: new Date().toISOString(),
  };
}

export default function CopilotChat({ store, isOpen, onClose }) {
  const storeName = store?.store_name || 'your store';

  // Session list & active session
  const [sessions, setSessions]       = useState(() => loadSessions());
  const [activeId, setActiveId]       = useState(() => { const s = loadSessions(); return s.length ? s[0].id : null; });
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput]             = useState('');
  const [isTyping, setIsTyping]       = useState(false);
  const chatEndRef = useRef(null);
  const inputRef   = useRef(null);

  // Auto-create first session if none exist
  useEffect(() => {
    if (sessions.length === 0) {
      const s = freshSession(storeName);
      const next = [s];
      setSessions(next);
      setActiveId(s.id);
      saveSessions(next);
    }
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  const activeSession = sessions.find(s => s.id === activeId) || sessions[0];
  const messages = activeSession?.messages || [];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  function updateSession(id, patch) {
    setSessions(prev => {
      const next = prev.map(s => s.id === id ? { ...s, ...patch } : s);
      saveSessions(next);
      return next;
    });
  }

  function newChat() {
    const s = freshSession(storeName);
    setSessions(prev => {
      const next = [s, ...prev];
      saveSessions(next);
      return next;
    });
    setActiveId(s.id);
    setShowHistory(false);
    setInput('');
  }

  function switchSession(id) {
    setActiveId(id);
    setShowHistory(false);
    setInput('');
  }

  function deleteSession(id) {
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      saveSessions(next);
      if (id === activeId) {
        if (next.length > 0) setActiveId(next[0].id);
        else {
          const s = freshSession(storeName);
          const withNew = [s];
          saveSessions(withNew);
          setSessions(withNew);
          setActiveId(s.id);
          return withNew;
        }
      }
      return next;
    });
    setShowHistory(false);
  }

  function clearCurrent() {
    if (!activeSession) return;
    const cleared = { ...activeSession, messages: [{
      role: 'assistant',
      content: `Hi! I'm your Pocket Dashboard AI Co-Pilot. I have real-time access to your store data. What would you like to know about your business today?`,
    }], title: 'New conversation' };
    updateSession(activeId, cleared);
  }

  const SUGGESTED = [
    "What is my exact net profit this month?",
    "Which 3 products have the highest RTO rate?",
    "Am I losing money on any ad campaigns right now?",
    "What's my COD vs prepaid split and how is it affecting RTO?",
  ];

  async function handleSend(text) {
    const msg = (text || input).trim();
    if (!msg || !activeSession) return;

    const newMsg    = { role: 'user', content: msg };
    const newMsgs   = [...messages, newMsg];
    const title     = activeSession.title === 'New conversation' ? msg.slice(0, 40) : activeSession.title;

    updateSession(activeId, { messages: newMsgs, title });
    setInput('');
    setIsTyping(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiUrl}/api/copilot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: store?.id, messages: newMsgs.filter(m => m.role !== 'system') }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      const withReply = [...newMsgs, { role: 'assistant', content: data.reply }];
      updateSession(activeId, { messages: withReply });
    } catch {
      updateSession(activeId, { messages: [...newMsgs, { role: 'assistant', content: 'Connection error. Please try again.' }] });
    } finally {
      setIsTyping(false);
    }
  }

  function formatRelative(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs  = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24)  return `${hrs}h ago`;
    return `${days}d ago`;
  }

  if (!isOpen) return null;

  return (
    <>
      <div style={{ position:'fixed', inset:0, zIndex:99, background:'rgba(0,0,0,0.4)', backdropFilter:'blur(4px)', animation:'fadeIn 0.2s ease-out' }} onClick={onClose} />

      <div style={{ position:'fixed', top:0, right:0, bottom:0, zIndex:100, width:'100%', maxWidth:'420px',
        background:'rgba(10,10,16,0.97)', backdropFilter:'blur(30px) saturate(150%)',
        borderLeft:'1px solid rgba(255,255,255,0.08)', display:'flex', flexDirection:'column',
        boxShadow:'-10px 0 40px rgba(0,0,0,0.5)', animation:'slideInRight 0.3s cubic-bezier(0.16,1,0.3,1) forwards' }}>

        <style>{`
          @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          .typing-dot { width: 5px; height: 5px; border-radius: 50%; background: rgba(255,255,255,0.6); animation: typingPulse 1.4s infinite ease-in-out both; }
          .typing-dot:nth-child(1) { animation-delay: -0.32s; }
          .typing-dot:nth-child(2) { animation-delay: -0.16s; }
          @keyframes typingPulse { 0%, 80%, 100% { transform: scale(0); opacity: 0.3; } 40% { transform: scale(1); opacity: 1; } }
          .cop-msg { white-space: pre-wrap; }
          .cop-msg strong { color: #fff; font-weight: 700; }
          .sess-item:hover { background: rgba(255,255,255,0.05) !important; }
          .copilot-btn:hover { opacity: 0.8; }
        `}</style>

        {/* ── Header ── */}
        <div style={{ padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'linear-gradient(90deg,rgba(167,139,250,0.05),transparent)', flexShrink:0 }}>
          {/* Top row: icon + title + close */}
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:9, background:'linear-gradient(135deg,#a78bfa,#38bdf8)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 14px -4px rgba(167,139,250,0.6)', flexShrink:0 }}>
              <Sparkles size={15} color="#000" />
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:700, color:'#fff', letterSpacing:'-0.2px' }}>AI Co-Pilot</div>
              <div style={{ fontSize:10.5, color:'rgba(45,212,160,0.85)', display:'flex', alignItems:'center', gap:4, marginTop:1 }}>
                <span style={{ width:5, height:5, borderRadius:'50%', background:'#2dd4a0', display:'inline-block' }} />
                Online &amp; Analyzing
              </div>
            </div>
            <button onClick={onClose}
              style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:7, width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
              <X size={14} color="rgba(255,255,255,0.6)" />
            </button>
          </div>

          {/* Bottom row: action buttons */}
          <div style={{ display:'flex', gap:6, marginTop:10 }}>
            <button onClick={newChat}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', background:'rgba(167,139,250,0.12)', border:'1px solid rgba(167,139,250,0.25)', borderRadius:7, color:'#c4b5fd', fontSize:11.5, fontWeight:600, cursor:'pointer', transition:'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(167,139,250,0.2)'; e.currentTarget.style.borderColor='rgba(167,139,250,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.background='rgba(167,139,250,0.12)'; e.currentTarget.style.borderColor='rgba(167,139,250,0.25)'; }}>
              <Plus size={12} /> New Chat
            </button>
            <button onClick={() => setShowHistory(v => !v)}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', background: showHistory ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:7, color:'rgba(255,255,255,0.55)', fontSize:11.5, fontWeight:500, cursor:'pointer', transition:'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.08)'; e.currentTarget.style.color='rgba(255,255,255,0.8)'; }}
              onMouseLeave={e => { e.currentTarget.style.background= showHistory ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'; e.currentTarget.style.color='rgba(255,255,255,0.55)'; }}>
              History {sessions.length > 1 && <span style={{ background:'rgba(167,139,250,0.3)', color:'#c4b5fd', borderRadius:4, padding:'1px 5px', fontSize:10, fontWeight:700 }}>{sessions.length}</span>}
              <ChevronDown size={11} style={{ transform: showHistory ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }} />
            </button>
          </div>
        </div>

        {/* ── Session History Dropdown ── */}
        {showHistory && (
          <div style={{ borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(0,0,0,0.3)', flexShrink:0, maxHeight:220, overflowY:'auto' }}>
            <div style={{ padding:'10px 16px 6px', fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.8px' }}>
              Chat History ({sessions.length})
            </div>
            {sessions.map(s => (
              <div key={s.id} className="sess-item"
                style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 16px', cursor:'pointer', background: s.id === activeId ? 'rgba(167,139,250,0.08)' : 'transparent', borderLeft: s.id === activeId ? '2px solid #a78bfa' : '2px solid transparent', transition:'background 0.15s' }}
                onClick={() => switchSession(s.id)}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12.5, color: s.id === activeId ? '#e2e8f0' : 'rgba(255,255,255,0.55)', fontWeight: s.id === activeId ? 600 : 400, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.title}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.25)', marginTop:1 }}>{formatRelative(s.createdAt)} · {s.messages.length - 1} messages</div>
                </div>
                <button onClick={e => { e.stopPropagation(); deleteSession(s.id); }}
                  style={{ background:'transparent', border:'none', cursor:'pointer', padding:'3px 4px', borderRadius:5, display:'flex', alignItems:'center', opacity:0.4, transition:'opacity 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}>
                  <Trash2 size={12} color="var(--loss-color)" />
                </button>
              </div>
            ))}
            <div style={{ padding:'8px 16px 10px', display:'flex', gap:8 }}>
              <button onClick={newChat}
                style={{ flex:1, padding:'7px 10px', background:'rgba(167,139,250,0.08)', border:'1px solid rgba(167,139,250,0.2)', borderRadius:8, color:'#a78bfa', fontSize:12, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                <Plus size={12} /> New Chat
              </button>
              <button onClick={clearCurrent}
                style={{ padding:'7px 10px', background:'rgba(244,63,94,0.06)', border:'1px solid rgba(244,63,94,0.2)', borderRadius:8, color:'rgba(244,63,94,0.8)', fontSize:12, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                <Trash2 size={12} /> Clear
              </button>
            </div>
          </div>
        )}

        {/* ── Suggested Questions (first message only) ── */}
        {messages.length === 1 && (
          <div style={{ padding:'16px 18px', display:'flex', flexDirection:'column', gap:6, borderBottom:'1px solid rgba(255,255,255,0.04)', flexShrink:0 }}>
            <p style={{ margin:'0 0 6px', fontSize:10, textTransform:'uppercase', letterSpacing:'0.6px', color:'rgba(255,255,255,0.25)', fontWeight:700 }}>Suggested Questions</p>
            {SUGGESTED.map((q, i) => (
              <button key={i} onClick={() => handleSend(q)}
                style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', padding:'9px 13px', borderRadius:8, color:'rgba(255,255,255,0.55)', fontSize:12.5, textAlign:'left', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, transition:'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(167,139,250,0.3)'; e.currentTarget.style.color = '#e2e8f0'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}>
                {q} <ArrowRight size={13} style={{ flexShrink:0, opacity:0.4 }} />
              </button>
            ))}
          </div>
        )}

        {/* ── Messages ── */}
        <div style={{ flex:1, overflowY:'auto', padding:'18px', display:'flex', flexDirection:'column', gap:14 }}>
          {messages.map((msg, idx) => (
            <div key={idx} style={{ display:'flex', alignItems:'flex-start', gap:9, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
              <div style={{ width:26, height:26, borderRadius:7, flexShrink:0,
                background: msg.role === 'assistant' ? 'rgba(167,139,250,0.14)' : 'rgba(255,255,255,0.08)',
                border: `1px solid ${msg.role === 'assistant' ? 'rgba(167,139,250,0.28)' : 'rgba(255,255,255,0.1)'}`,
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                {msg.role === 'assistant' ? <Bot size={14} color="rgba(167,139,250,0.9)" /> : <User size={14} color="rgba(255,255,255,0.7)" />}
              </div>
              <div style={{
                background: msg.role === 'user' ? 'rgba(255,255,255,0.05)' : 'transparent',
                border: msg.role === 'user' ? '1px solid rgba(255,255,255,0.08)' : 'none',
                padding: msg.role === 'user' ? '9px 13px' : '2px 0',
                borderRadius:11, borderTopRightRadius: msg.role === 'user' ? 2 : 11, borderTopLeftRadius: msg.role === 'assistant' ? 2 : 11,
                color:'#d1d5db', fontSize:13, lineHeight:1.65, maxWidth:'86%',
              }}>
                <span className="cop-msg" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
              </div>
            </div>
          ))}

          {isTyping && (
            <div style={{ display:'flex', alignItems:'flex-start', gap:9 }}>
              <div style={{ width:26, height:26, borderRadius:7, flexShrink:0, background:'rgba(167,139,250,0.14)', border:'1px solid rgba(167,139,250,0.28)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Bot size={14} color="rgba(167,139,250,0.9)" />
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:4, padding:'10px 0' }}>
                <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* ── Input ── */}
        <div style={{ padding:'14px 18px', borderTop:'1px solid rgba(255,255,255,0.06)', background:'rgba(10,10,16,0.98)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:12, padding:'5px 6px 5px 12px' }}>
            <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Ask anything about your data..."
              style={{ flex:1, background:'transparent', border:'none', color:'#fff', fontSize:13, outline:'none', fontFamily:'Inter', padding:'6px 0' }} />
            <button onClick={() => handleSend()} disabled={!input.trim() || isTyping}
              style={{ background: input.trim() ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.04)', color: input.trim() ? '#a78bfa' : 'rgba(255,255,255,0.25)',
                border:'none', borderRadius:8, padding:'7px', display:'flex', alignItems:'center', justifyContent:'center',
                cursor: input.trim() ? 'pointer' : 'not-allowed', transition:'all 0.15s' }}>
              <Send size={15} />
            </button>
          </div>
          <div style={{ textAlign:'center', marginTop:10, fontSize:10, color:'rgba(255,255,255,0.18)' }}>
            AI reads your real store data · Always verify critical numbers
          </div>
        </div>
      </div>
    </>
  );
}
