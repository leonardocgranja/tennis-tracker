import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase ────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://jokntxttmillstkpyoaq.supabase.co";
const SUPABASE_KEY = "sb_publishable_nRuJ-FVLvkjyk0tJMwOLTg_VztF_9sg";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: { params: { eventsPerSecond: 10 } }
});
const ADMIN_PASSWORD = "mariaamelia2025";

// ─── URL helpers ─────────────────────────────────────────────────────────────
function getMatchIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("match") || null;
}

function buildShareURL(matchId) {
  const base = window.location.origin + window.location.pathname;
  return `${base}?match=${matchId}`;
}

// ─── Tennis helpers ──────────────────────────────────────────────────────────
const TENNIS_POINTS = ["0", "15", "30", "40", "AD"];
const pt = (p) => TENNIS_POINTS[p] ?? p;

function calcPoint(score, winner) {
  const s = { ...score, sets: [...score.sets] };
  const opp = winner === "p1" ? "p2" : "p1";
  const wp = s[winner + "Points"], op = s[opp + "Points"];
  if (wp === 3 && op === 3) { s[winner + "Points"] = 4; return s; }
  if (wp === 4) { s[winner + "Games"]++; s.p1Points = 0; s.p2Points = 0; return checkSet(s, winner); }
  if (op === 4) { s[winner + "Points"] = 3; s[opp + "Points"] = 3; return s; }
  if (wp === 3 && op < 3) { s[winner + "Games"]++; s.p1Points = 0; s.p2Points = 0; return checkSet(s, winner); }
  s[winner + "Points"]++;
  return s;
}

function checkSet(s, winner) {
  const opp = winner === "p1" ? "p2" : "p1";
  const wg = s[winner + "Games"], og = s[opp + "Games"];
  if ((wg >= 6 && wg - og >= 2) || wg === 7) {
    s[winner + "Sets"]++;
    s.sets = [...s.sets, { p1: s.p1Games, p2: s.p2Games }];
    s.p1Games = 0; s.p2Games = 0;
  }
  return s;
}

const emptyStats = () => ({ aces: 0, winners: 0, unforced: 0, points: 0 });
const emptyScore = () => ({ p1Points: 0, p2Points: 0, p1Games: 0, p2Games: 0, p1Sets: 0, p2Sets: 0, sets: [] });
const emptyMatch = (id) => ({
  id,
  score: emptyScore(),
  stats: { p1: emptyStats(), p2: emptyStats() },
  events: [],
  likes: 0,
  matchState: "idle",
  p1Name: "Maria Amélia",
  p2Name: "Adversária",
  p1Photo: null,
  p2Photo: null,
  surface: "Saibro",
  tournament: "",
  weather: null,
  location: null,
});

// ─── Components ───────────────────────────────────────────────────────────────
function Avatar({ src, name, size = 80 }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: src ? "transparent" : "linear-gradient(135deg,#c9a96e,#8b6914)",
      border: "3px solid #c9a96e", overflow: "hidden",
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      boxShadow: "0 4px 20px rgba(201,169,110,0.35)"
    }}>
      {src
        ? <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <span style={{ color: "#fff", fontWeight: 700, fontSize: size * 0.32, fontFamily: "serif" }}>{initials}</span>}
    </div>
  );
}

function StatBar({ label, v1, v2 }) {
  const total = v1 + v2 || 1;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#c9a96e", marginBottom: 4 }}>
        <span style={{ fontWeight: 700 }}>{v1}</span>
        <span style={{ color: "#8b7355", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
        <span style={{ fontWeight: 700 }}>{v2}</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: "#1a1a2e", overflow: "hidden", display: "flex" }}>
        <div style={{ width: `${(v1 / total) * 100}%`, background: "linear-gradient(90deg,#c9a96e,#e8c97a)", transition: "width .5s" }} />
        <div style={{ flex: 1, background: "linear-gradient(90deg,#4a3f6b,#7c6f9e)" }} />
      </div>
    </div>
  );
}

function weatherIcon(code) {
  if (code === 0) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  return "⛈️";
}

function Toast({ message, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t); }, []);
  return (
    <div style={{
      position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)",
      background: "#4ade80", color: "#0d0d1a", padding: "12px 24px",
      borderRadius: 12, fontWeight: 700, fontSize: 14, zIndex: 999,
      boxShadow: "0 4px 20px rgba(74,222,128,0.4)", animation: "fadeUp .3s ease"
    }}>{message}</div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function TennisApp() {
  const urlMatchId = getMatchIdFromURL();

  // If URL has ?match=xxx → go straight to viewer
  const [mode, setMode] = useState(urlMatchId ? "viewer" : "choose");
  const [matchId, setMatchId] = useState(urlMatchId || null);
  const [adminInput, setAdminInput] = useState("");
  const [adminError, setAdminError] = useState(false);
  const [tab, setTab] = useState("placar");
  const [match, setMatch] = useState(emptyMatch(urlMatchId || ""));
  const [rally, setRally] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentName, setCommentName] = useState("");
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [toast, setToast] = useState(null);
  const [shareModal, setShareModal] = useState(false);
  const p1PhotoRef = useRef();
  const p2PhotoRef = useRef();
  const commentsEndRef = useRef();
  const matchSubRef = useRef(null);
  const commentSubRef = useRef(null);

  const isAdmin = mode === "admin";

  // ── Realtime subscriptions ──────────────────────────────────────────────
  const subscribeRealtime = useCallback((mId) => {
    // Clean up previous subscriptions
    if (matchSubRef.current) supabase.removeChannel(matchSubRef.current);
    if (commentSubRef.current) supabase.removeChannel(commentSubRef.current);

    matchSubRef.current = supabase
      .channel(`match-${mId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `id=eq.${mId}` },
        (payload) => {
          if (payload.new?.data) {
            setMatch(payload.new.data);
          }
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    commentSubRef.current = supabase
      .channel(`comments-${mId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "comments", filter: `match_id=eq.${mId}` },
        (payload) => {
          setComments(prev => {
            // avoid duplicates
            if (prev.find(c => c.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      if (matchSubRef.current) supabase.removeChannel(matchSubRef.current);
      if (commentSubRef.current) supabase.removeChannel(commentSubRef.current);
    };
  }, []);

  // ── Load data when mode/matchId changes ─────────────────────────────────
  useEffect(() => {
    if (mode === "choose" || !matchId) return;
    loadMatch(matchId);
    loadComments(matchId);
    const unsub = subscribeRealtime(matchId);
    return unsub;
  }, [mode, matchId]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  // Polling fallback every 5s for viewers (belt-and-suspenders)
  useEffect(() => {
    if (mode !== "viewer" || !matchId) return;
    const interval = setInterval(() => loadMatch(matchId), 5000);
    return () => clearInterval(interval);
  }, [mode, matchId]);

  async function loadMatch(mId) {
    const { data } = await supabase.from("matches").select("data").eq("id", mId).single();
    if (data?.data) setMatch(data.data);
  }

  async function loadComments(mId) {
    const { data } = await supabase.from("comments").select("*").eq("match_id", mId).order("created_at", { ascending: true });
    if (data) setComments(data);
  }

  async function saveMatch(newMatch) {
    setSyncing(true);
    await supabase.from("matches").upsert({ id: matchId, data: newMatch, updated_at: new Date().toISOString() });
    setSyncing(false);
  }

  function updateMatch(updater) {
    setMatch(prev => {
      const next = updater(prev);
      saveMatch(next);
      return next;
    });
  }

  // ── Admin login ──────────────────────────────────────────────────────────
  function handleAdminLogin() {
    if (adminInput === ADMIN_PASSWORD) {
      const newId = "match-" + Date.now();
      setMatchId(newId);
      setMatch(emptyMatch(newId));
      setMode("admin");
      setAdminError(false);
      setTab("controle");
    } else {
      setAdminError(true);
    }
  }

  // ── Check-in ─────────────────────────────────────────────────────────────
  async function handleCheckin() {
    setLoadingWeather(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lon } = pos.coords;
      try {
        const [wRes, lRes] = await Promise.all([
          fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`),
          fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
        ]);
        const wData = await wRes.json();
        const lData = await lRes.json();
        const cw = wData.current_weather;
        const city = lData.address?.city || lData.address?.town || lData.address?.village || "Local";
        const state = lData.address?.state || "";
        updateMatch(m => ({
          ...m,
          location: `${city}${state ? ", " + state : ""}`,
          weather: { temp: Math.round(cw.temperature), wind: Math.round(cw.windspeed), code: cw.weathercode }
        }));
      } catch {}
      setLoadingWeather(false);
    }, () => setLoadingWeather(false));
  }

  // ── Point flow ───────────────────────────────────────────────────────────
  function handlePoint(winner) { setRally({ winner }); }

  function handleShot(type) {
    const w = rally.winner;
    const opp = w === "p1" ? "p2" : "p1";
    const shotLabels = { ace: "🎯 ACE", winner: "⚡ Winner", point: "✅ Ponto", unforced: "❌ Erro não forçado" };
    const wName = w === "p1" ? match.p1Name : match.p2Name;
    const eventText = type === "unforced"
      ? `Erro não forçado → ponto para ${wName}`
      : `${shotLabels[type]} de ${wName}`;

    updateMatch(m => {
      const newScore = calcPoint(m.score, w);
      const newStats = { p1: { ...m.stats.p1 }, p2: { ...m.stats.p2 } };
      newStats[w].points++;
      if (type === "ace") newStats[w].aces++;
      if (type === "winner") newStats[w].winners++;
      if (type === "unforced") newStats[opp].unforced++;
      const newEvent = { text: eventText, time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) };
      return { ...m, score: newScore, stats: newStats, events: [newEvent, ...m.events].slice(0, 60) };
    });
    setRally(null);
  }

  // ── Photo ────────────────────────────────────────────────────────────────
  function handlePhotoUpload(player, e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => updateMatch(m => ({ ...m, [player + "Photo"]: ev.target.result }));
    reader.readAsDataURL(file);
  }

  // ── Comment ──────────────────────────────────────────────────────────────
  async function postComment() {
    if (!commentText.trim() || !matchId) return;
    const optimistic = {
      id: Date.now(),
      match_id: matchId,
      name: commentName.trim() || "Torcedor",
      text: commentText.trim(),
      created_at: new Date().toISOString(),
    };
    setComments(prev => [...prev, optimistic]);
    setCommentText("");
    await supabase.from("comments").insert({
      match_id: matchId,
      name: optimistic.name,
      text: optimistic.text,
    });
  }

  // ── Like ─────────────────────────────────────────────────────────────────
  function addLike() { updateMatch(m => ({ ...m, likes: (m.likes || 0) + 1 })); }

  // ── Reset ────────────────────────────────────────────────────────────────
  function resetMatch() {
    updateMatch(m => ({ ...m, score: emptyScore(), stats: { p1: emptyStats(), p2: emptyStats() }, events: [], matchState: "idle" }));
    setRally(null);
  }

  // ── Share ────────────────────────────────────────────────────────────────
  function handleShare() {
    const url = buildShareURL(matchId);
    if (navigator.share) {
      navigator.share({ title: `🎾 ${match.p1Name} vs ${match.p2Name}`, text: "Acompanhe a partida ao vivo!", url });
    } else {
      navigator.clipboard.writeText(url).then(() => setToast("Link copiado! 🎾"));
      setShareModal(false);
    }
  }

  // ─── Styles ───────────────────────────────────────────────────────────────
  const bg = "#0d0d1a";
  const card = "rgba(255,255,255,0.04)";
  const gold = "#c9a96e";
  const goldLight = "#e8c97a";
  const purple = "#7c6f9e";
  const text = "#f0ede8";
  const muted = "#8b7355";

  const tabStyle = (t) => ({
    padding: "10px 16px", border: "none",
    background: tab === t ? "linear-gradient(135deg,#c9a96e,#8b6914)" : "transparent",
    color: tab === t ? "#0d0d1a" : muted,
    fontWeight: tab === t ? 800 : 500,
    borderRadius: 8, cursor: "pointer", fontSize: 13,
    letterSpacing: 0.5, transition: "all .2s", fontFamily: "Georgia, serif"
  });

  const btnStyle = (color = gold) => ({
    padding: "14px 24px",
    background: `linear-gradient(135deg,${color},${color}bb)`,
    color: color === gold ? "#0d0d1a" : "#fff",
    border: "none", borderRadius: 12, fontWeight: 800,
    fontSize: 15, cursor: "pointer", letterSpacing: 0.5,
    boxShadow: `0 4px 20px ${color}44`,
    transition: "all .15s", fontFamily: "Georgia, serif"
  });

  const inputStyle = {
    width: "100%", padding: "12px 16px", borderRadius: 10,
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(201,169,110,0.2)",
    color: text, fontSize: 14, boxSizing: "border-box",
    fontFamily: "Georgia, serif", outline: "none"
  };

  // ─── SCREEN: CHOOSE ──────────────────────────────────────────────────────
  if (mode === "choose") {
    return (
      <div style={{
        minHeight: "100vh", background: bg, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: 24,
        backgroundImage: "radial-gradient(ellipse at 20% 20%, rgba(124,111,158,0.15) 0%, transparent 60%)",
        fontFamily: "Georgia, serif", color: text
      }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🎾</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: gold, marginBottom: 8, textAlign: "center" }}>Tennis Tracker</div>
        <div style={{ color: muted, marginBottom: 48, textAlign: "center", fontSize: 14 }}>Acompanhe partidas em tempo real</div>

        <div style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: card, border: `1px solid rgba(201,169,110,0.2)`, borderRadius: 16, padding: 20 }}>
            <div style={{ color: gold, fontWeight: 700, marginBottom: 12, fontSize: 13 }}>🔒 Admin — Iniciar partida</div>
            <input type="password" placeholder="Senha" value={adminInput}
              onChange={e => setAdminInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdminLogin()}
              style={{ ...inputStyle, marginBottom: 10 }} />
            {adminError && <div style={{ color: "#e05050", fontSize: 12, marginBottom: 8 }}>Senha incorreta</div>}
            <button onClick={handleAdminLogin} style={{ ...btnStyle(), width: "100%", padding: 14 }}>
              Entrar como Admin
            </button>
          </div>

          <div style={{ textAlign: "center", color: muted, fontSize: 12 }}>
            Torcedor? Peça o link da partida para quem está transmitindo.
          </div>
        </div>
      </div>
    );
  }

  // ─── SCREEN: VIEWER / ADMIN ──────────────────────────────────────────────
  const viewerTabs = ["placar", "estatísticas", "torcida"];
  const adminTabs = ["placar", "controle", "estatísticas", "torcida", "perfis"];
  const tabs = isAdmin ? adminTabs : viewerTabs;
  const shareURL = matchId ? buildShareURL(matchId) : "";

  return (
    <div style={{
      minHeight: "100vh", background: bg, color: text, fontFamily: "Georgia, serif",
      backgroundImage: "radial-gradient(ellipse at 20% 20%, rgba(124,111,158,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(201,169,110,0.08) 0%, transparent 60%)"
    }}>

      {/* ── Header ── */}
      <div style={{
        background: "rgba(13,13,26,0.95)", backdropFilter: "blur(20px)",
        borderBottom: `1px solid rgba(201,169,110,0.2)`,
        padding: "14px 20px", position: "sticky", top: 0, zIndex: 100
      }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ fontSize: 22 }}>🎾</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 17, color: gold }}>
                {match.tournament || "Tennis Tracker"}
              </div>
              <div style={{ fontSize: 11, color: muted }}>
                {match.surface}
                {match.location && ` · ${match.location}`}
                {match.weather && ` · ${weatherIcon(match.weather.code)} ${match.weather.temp}°C`}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              {match.matchState === "active" && (
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", animation: "pulse 1.5s infinite" }} />
                  <span style={{ fontSize: 11, color: "#4ade80", fontWeight: 700 }}>AO VIVO</span>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: connected ? "#4ade80" : "#e05050" }} />
                <span style={{ fontSize: 10, color: muted }}>{connected ? "Conectado" : "Conectando..."}</span>
              </div>
              {syncing && <span style={{ fontSize: 10, color: gold }}>Salvando...</span>}
              {isAdmin && (
                <span style={{ fontSize: 10, background: "rgba(201,169,110,0.15)", color: gold, padding: "2px 7px", borderRadius: 6 }}>ADMIN</span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
            {tabs.map(t => (
              <button key={t} style={tabStyle(t)} onClick={() => setTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
            {/* Share button — visible to admin when match is active */}
            {isAdmin && match.matchState === "active" && (
              <button onClick={() => setShareModal(true)} style={{
                marginLeft: "auto", padding: "8px 14px",
                background: "linear-gradient(135deg,#4ade80,#22c55e)",
                border: "none", borderRadius: 8, color: "#0d0d1a",
                fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "Georgia, serif"
              }}>
                📤 Compartilhar
              </button>
            )}
            {!isAdmin && (
              <button onClick={() => setMode("choose")} style={{
                marginLeft: "auto", padding: "8px 12px", background: "transparent",
                border: "none", color: muted, cursor: "pointer", fontSize: 12
              }}>← Sair</button>
            )}
          </div>
        </div>
      </div>

      {/* ── Share Modal ── */}
      {shareModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 200, padding: 24
        }} onClick={() => setShareModal(false)}>
          <div style={{
            background: "#16162a", border: `1px solid rgba(201,169,110,0.3)`,
            borderRadius: 20, padding: 28, maxWidth: 360, width: "100%"
          }} onClick={e => e.stopPropagation()}>
            <div style={{ color: gold, fontWeight: 800, fontSize: 18, marginBottom: 8 }}>📤 Compartilhar partida</div>
            <div style={{ color: muted, fontSize: 13, marginBottom: 20 }}>
              Envie este link para a família acompanhar ao vivo:
            </div>
            <div style={{
              background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 14px",
              fontSize: 12, color: goldLight, wordBreak: "break-all", marginBottom: 16,
              border: "1px solid rgba(201,169,110,0.2)"
            }}>{shareURL}</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleShare} style={{ ...btnStyle(), flex: 1, padding: 14, fontSize: 14 }}>
                {navigator.share ? "📤 Compartilhar" : "📋 Copiar link"}
              </button>
              <button onClick={() => setShareModal(false)} style={{
                padding: "14px 16px", background: "rgba(255,255,255,0.06)",
                border: "none", borderRadius: 12, color: muted, cursor: "pointer", fontSize: 14
              }}>✕</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "20px 16px" }}>

        {/* ── PLACAR ── */}
        {tab === "placar" && (
          <div>
            <div style={{ background: card, border: `1px solid rgba(201,169,110,0.2)`, borderRadius: 20, padding: 24, marginBottom: 20 }}>
              {match.score.sets.length > 0 && (
                <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 20 }}>
                  {match.score.sets.map((s, i) => (
                    <div key={i} style={{ textAlign: "center", opacity: 0.65 }}>
                      <div style={{ color: muted, fontSize: 10, marginBottom: 3 }}>SET {i + 1}</div>
                      <div style={{ fontSize: 13 }}>{s.p1} – {s.p2}</div>
                    </div>
                  ))}
                </div>
              )}
              {[
                { key: "p1", name: match.p1Name, photo: match.p1Photo },
                { key: "p2", name: match.p2Name, photo: match.p2Photo }
              ].map((p, i) => (
                <div key={p.key}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0" }}>
                    <Avatar src={p.photo} name={p.name} size={50} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{p.name}</div>
                      <div style={{ color: muted, fontSize: 12 }}>{match.stats[p.key].aces} aces · {match.stats[p.key].winners} winners</div>
                    </div>
                    <div style={{ display: "flex", gap: 18 }}>
                      {[
                        { label: "SETS", v: match.score[p.key + "Sets"] },
                        { label: "GAMES", v: match.score[p.key + "Games"] },
                        { label: "PONTOS", v: pt(match.score[p.key + "Points"]) },
                      ].map(s => (
                        <div key={s.label} style={{ textAlign: "center" }}>
                          <div style={{ color: muted, fontSize: 9, marginBottom: 2, letterSpacing: 0.5 }}>{s.label}</div>
                          <div style={{ fontSize: 26, fontWeight: 900, color: s.label === "SETS" && match.score[p.key + "Sets"] > match.score[(p.key === "p1" ? "p2" : "p1") + "Sets"] ? gold : text }}>
                            {s.v}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {i === 0 && <div style={{ height: 1, background: "rgba(201,169,110,0.1)" }} />}
                </div>
              ))}
            </div>

            <button onClick={addLike} style={{ ...btnStyle(purple), width: "100%", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              ❤️ Torcer! ({match.likes || 0})
            </button>

            {/* Event log */}
            <div style={{ background: card, border: `1px solid rgba(201,169,110,0.1)`, borderRadius: 16, padding: 16, marginBottom: 20 }}>
              <div style={{ color: gold, fontWeight: 700, marginBottom: 12, fontSize: 12, letterSpacing: 1 }}>HISTÓRICO</div>
              {match.events.length === 0
                ? <div style={{ color: muted, fontSize: 13, textAlign: "center", padding: "16px 0" }}>Nenhum ponto registrado ainda</div>
                : match.events.map((e, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, padding: "7px 0", borderBottom: i < match.events.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <span style={{ color: muted, fontSize: 11, minWidth: 38 }}>{e.time}</span>
                    <span style={{ fontSize: 13 }}>{e.text}</span>
                  </div>
                ))
              }
            </div>

            {/* Comments */}
            <div style={{ background: card, border: `1px solid rgba(201,169,110,0.1)`, borderRadius: 16, padding: 16 }}>
              <div style={{ color: gold, fontWeight: 700, marginBottom: 12, fontSize: 12, letterSpacing: 1 }}>COMENTÁRIOS</div>
              <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 12 }}>
                {comments.length === 0
                  ? <div style={{ color: muted, fontSize: 13, textAlign: "center", padding: "12px 0" }}>Nenhum comentário ainda</div>
                  : comments.map(c => (
                    <div key={c.id} style={{ padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <span style={{ color: gold, fontWeight: 700, fontSize: 12 }}>{c.name}</span>
                        <span style={{ color: muted, fontSize: 10 }}>{new Date(c.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <div style={{ fontSize: 13 }}>{c.text}</div>
                    </div>
                  ))
                }
                <div ref={commentsEndRef} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={commentName} onChange={e => setCommentName(e.target.value)} placeholder="Nome"
                  style={{ ...inputStyle, width: 90, padding: "8px 10px" }} />
                <input value={commentText} onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && postComment()}
                  placeholder="Comentar..." style={{ ...inputStyle, flex: 1, padding: "8px 12px" }} />
                <button onClick={postComment} style={{ ...btnStyle(), padding: "8px 14px", fontSize: 14 }}>→</button>
              </div>
            </div>
          </div>
        )}

        {/* ── CONTROLE (admin only) ── */}
        {tab === "controle" && isAdmin && (
          <div>
            {match.matchState === "idle" && (
              <div style={{ background: card, border: `1px solid rgba(201,169,110,0.2)`, borderRadius: 20, padding: 24, marginBottom: 20 }}>
                <div style={{ color: gold, fontWeight: 700, marginBottom: 16, fontSize: 13, letterSpacing: 1 }}>CHECK-IN DA PARTIDA</div>
                <input value={match.tournament} onChange={e => updateMatch(m => ({ ...m, tournament: e.target.value }))}
                  placeholder="Nome do torneio / evento" style={{ ...inputStyle, marginBottom: 12 }} />
                <select value={match.surface} onChange={e => updateMatch(m => ({ ...m, surface: e.target.value }))}
                  style={{ ...inputStyle, marginBottom: 16, background: "#1a1a2e" }}>
                  {["Saibro", "Quadra dura", "Grama", "Carpete"].map(s => <option key={s}>{s}</option>)}
                </select>
                <button onClick={handleCheckin} disabled={loadingWeather}
                  style={{ ...btnStyle(purple), width: "100%", marginBottom: 12, opacity: loadingWeather ? 0.6 : 1 }}>
                  {loadingWeather ? "Obtendo localização..." : "📍 Check-in (localização + clima)"}
                </button>
                {match.weather && (
                  <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 12, fontSize: 13, color: gold, textAlign: "center", marginBottom: 12 }}>
                    {weatherIcon(match.weather.code)} {match.weather.temp}°C · 💨 {match.weather.wind} km/h · {match.location}
                  </div>
                )}
                <button onClick={() => { updateMatch(m => ({ ...m, matchState: "active" })); setShareModal(true); }}
                  style={{ ...btnStyle(), width: "100%", fontSize: 16, padding: 18 }}>
                  🎾 Iniciar Partida
                </button>
              </div>
            )}

            {match.matchState === "active" && !rally && (
              <div>
                {/* Share reminder */}
                <div style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 12, padding: 12, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: "#4ade80" }}>🔗 Partida ao vivo</span>
                  <button onClick={() => setShareModal(true)} style={{ ...btnStyle("#4ade80"), padding: "6px 14px", fontSize: 12 }}>
                    📤 Compartilhar
                  </button>
                </div>

                <div style={{ color: gold, fontWeight: 700, marginBottom: 16, fontSize: 14, letterSpacing: 1, textAlign: "center" }}>QUEM FEZ O PONTO?</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
                  {[
                    { key: "p1", name: match.p1Name, photo: match.p1Photo },
                    { key: "p2", name: match.p2Name, photo: match.p2Photo }
                  ].map(p => (
                    <button key={p.key} onClick={() => handlePoint(p.key)} style={{
                      background: "rgba(255,255,255,0.04)", border: `2px solid rgba(201,169,110,0.3)`,
                      borderRadius: 18, padding: 20, cursor: "pointer",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                      transition: "all .2s", color: text
                    }}>
                      <Avatar src={p.photo} name={p.name} size={58} />
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</span>
                      <div style={{ fontSize: 24, fontWeight: 900, color: gold }}>{pt(match.score[p.key + "Points"])}</div>
                    </button>
                  ))}
                </div>
                <div style={{ textAlign: "center", background: card, borderRadius: 12, padding: 12, fontSize: 13, color: muted, marginBottom: 16 }}>
                  Sets: {match.score.p1Sets}–{match.score.p2Sets} · Games: {match.score.p1Games}–{match.score.p2Games}
                </div>
                <button onClick={resetMatch} style={{ ...btnStyle("#e05050"), width: "100%", fontSize: 13 }}>
                  🔄 Resetar Partida
                </button>
              </div>
            )}

            {match.matchState === "active" && rally && (
              <div>
                <div style={{ color: gold, fontWeight: 700, marginBottom: 6, fontSize: 14, letterSpacing: 1, textAlign: "center" }}>COMO FOI O PONTO?</div>
                <div style={{ color: muted, fontSize: 13, textAlign: "center", marginBottom: 20 }}>
                  Ponto para: <strong style={{ color: text }}>{rally.winner === "p1" ? match.p1Name : match.p2Name}</strong>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { key: "ace", label: "🎯 ACE", desc: "Serviço não tocado", color: "#4ade80" },
                    { key: "winner", label: "⚡ Winner", desc: "Bola vencedora", color: goldLight },
                    { key: "point", label: "✅ Ponto", desc: "Rali normal", color: purple },
                    { key: "unforced", label: "❌ Erro NF", desc: "Erro não forçado", color: "#e05050" },
                  ].map(s => (
                    <button key={s.key} onClick={() => handleShot(s.key)} style={{
                      background: "rgba(255,255,255,0.04)", border: `2px solid ${s.color}44`,
                      borderRadius: 16, padding: "18px 12px", cursor: "pointer",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                      transition: "all .2s", color: text
                    }}>
                      <span style={{ fontSize: 22 }}>{s.label.split(" ")[0]}</span>
                      <span style={{ fontWeight: 700, color: s.color, fontSize: 14 }}>{s.label.split(" ").slice(1).join(" ")}</span>
                      <span style={{ fontSize: 11, color: muted }}>{s.desc}</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => setRally(null)} style={{ ...btnStyle(muted), width: "100%", marginTop: 14, fontSize: 13, background: "rgba(255,255,255,0.06)", color: muted, boxShadow: "none" }}>
                  ← Cancelar
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── ESTATÍSTICAS ── */}
        {tab === "estatísticas" && (
          <div>
            <div style={{ background: card, border: `1px solid rgba(201,169,110,0.2)`, borderRadius: 20, padding: 24, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                {[
                  { key: "p1", name: match.p1Name, photo: match.p1Photo },
                  { key: "p2", name: match.p2Name, photo: match.p2Photo }
                ].map((p, i) => (
                  <div key={p.key} style={{ display: "flex", flexDirection: "column", alignItems: i === 1 ? "flex-end" : "flex-start", gap: 6 }}>
                    <Avatar src={p.photo} name={p.name} size={44} />
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{p.name}</div>
                  </div>
                ))}
                <div style={{ textAlign: "center", alignSelf: "center" }}>
                  <div style={{ color: muted, fontSize: 10, marginBottom: 4 }}>PLACAR</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: gold }}>{match.score.p1Sets} – {match.score.p2Sets}</div>
                </div>
              </div>
              <StatBar label="Aces" v1={match.stats.p1.aces} v2={match.stats.p2.aces} />
              <StatBar label="Winners" v1={match.stats.p1.winners} v2={match.stats.p2.winners} />
              <StatBar label="Erros NF" v1={match.stats.p1.unforced} v2={match.stats.p2.unforced} />
              <StatBar label="Pontos" v1={match.stats.p1.points} v2={match.stats.p2.points} />
            </div>
            {match.score.sets.length > 0 && (
              <div style={{ background: card, border: `1px solid rgba(201,169,110,0.1)`, borderRadius: 16, padding: 16 }}>
                <div style={{ color: gold, fontWeight: 700, marginBottom: 12, fontSize: 12, letterSpacing: 1 }}>SETS DISPUTADOS</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ color: muted, fontSize: 11 }}>
                      <td style={{ padding: "6px 0" }}>SET</td>
                      <td style={{ textAlign: "center" }}>{match.p1Name.split(" ")[0]}</td>
                      <td style={{ textAlign: "center" }}>{match.p2Name.split(" ")[0]}</td>
                    </tr>
                  </thead>
                  <tbody>
                    {match.score.sets.map((s, i) => (
                      <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                        <td style={{ padding: "8px 0", color: muted }}>Set {i + 1}</td>
                        <td style={{ textAlign: "center", fontWeight: s.p1 > s.p2 ? 800 : 400, color: s.p1 > s.p2 ? gold : text }}>{s.p1}</td>
                        <td style={{ textAlign: "center", fontWeight: s.p2 > s.p1 ? 800 : 400, color: s.p2 > s.p1 ? gold : text }}>{s.p2}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TORCIDA ── */}
        {tab === "torcida" && (
          <div>
            <div style={{ background: card, border: `1px solid rgba(201,169,110,0.2)`, borderRadius: 20, padding: 20, marginBottom: 16 }}>
              <button onClick={addLike} style={{ ...btnStyle(), width: "100%", fontSize: 20, padding: 22 }}>
                ❤️ Torcer! ({match.likes || 0})
              </button>
            </div>
            <div style={{ background: card, border: `1px solid rgba(201,169,110,0.1)`, borderRadius: 16, padding: 16 }}>
              <div style={{ color: gold, fontWeight: 700, marginBottom: 12, fontSize: 12, letterSpacing: 1 }}>COMENTÁRIOS AO VIVO</div>
              <div style={{ maxHeight: 340, overflowY: "auto", marginBottom: 14 }}>
                {comments.length === 0
                  ? <div style={{ color: muted, fontSize: 13, textAlign: "center", padding: "24px 0" }}>Nenhum comentário ainda. Seja o primeiro! 🎾</div>
                  : comments.map(c => (
                    <div key={c.id} style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <span style={{ color: gold, fontWeight: 700, fontSize: 13 }}>{c.name}</span>
                        <span style={{ color: muted, fontSize: 10 }}>{new Date(c.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <div style={{ fontSize: 14, marginTop: 2 }}>{c.text}</div>
                    </div>
                  ))
                }
                <div ref={commentsEndRef} />
              </div>
              <input value={commentName} onChange={e => setCommentName(e.target.value)} placeholder="Seu nome"
                style={{ ...inputStyle, marginBottom: 8 }} />
              <div style={{ display: "flex", gap: 8 }}>
                <input value={commentText} onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && postComment()}
                  placeholder="Escreva um comentário..."
                  style={{ ...inputStyle, flex: 1, padding: "10px 14px" }} />
                <button onClick={postComment} style={{ ...btnStyle(), padding: "10px 18px" }}>→</button>
              </div>
            </div>
          </div>
        )}

        {/* ── PERFIS (admin only) ── */}
        {tab === "perfis" && isAdmin && (
          <div>
            {[
              { key: "p1", name: match.p1Name, photo: match.p1Photo, ref: p1PhotoRef },
              { key: "p2", name: match.p2Name, photo: match.p2Photo, ref: p2PhotoRef },
            ].map((p, i) => (
              <div key={p.key} style={{ background: card, border: `1px solid rgba(201,169,110,0.2)`, borderRadius: 20, padding: 24, marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
                  <div style={{ position: "relative", cursor: "pointer" }} onClick={() => p.ref.current.click()}>
                    <Avatar src={p.photo} name={p.name} size={72} />
                    <div style={{ position: "absolute", bottom: 0, right: 0, width: 22, height: 22, borderRadius: "50%", background: gold, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>📷</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <input value={p.name}
                      onChange={e => { const v = e.target.value; updateMatch(m => ({ ...m, [p.key + "Name"]: v })); }}
                      style={{ width: "100%", background: "transparent", border: "none", borderBottom: `1px solid rgba(201,169,110,0.3)`, color: text, fontSize: 18, fontWeight: 700, padding: "4px 0", fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box" }} />
                    <div style={{ color: muted, fontSize: 12, marginTop: 4 }}>{i === 0 ? "Jogadora principal" : "Adversária"}</div>
                  </div>
                  <input ref={p.ref} type="file" accept="image/*" style={{ display: "none" }}
                    onChange={e => handlePhotoUpload(p.key, e)} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { label: "Sets", v: match.score[p.key + "Sets"] },
                    { label: "Games", v: match.score[p.key + "Games"] },
                    { label: "Aces", v: match.stats[p.key].aces },
                    { label: "Winners", v: match.stats[p.key].winners },
                    { label: "Pontos", v: match.stats[p.key].points },
                    { label: "Erros NF", v: match.stats[p.key].unforced },
                  ].map(s => (
                    <div key={s.label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "10px 14px" }}>
                      <div style={{ color: muted, fontSize: 10, letterSpacing: 1 }}>{s.label.toUpperCase()}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: gold }}>{s.v}</div>
                    </div>
                  ))}
                </div>
                <button onClick={() => p.ref.current.click()} style={{ ...btnStyle(purple), width: "100%", marginTop: 14, fontSize: 13 }}>
                  📷 Alterar foto de {p.name.split(" ")[0]}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.2)} }
        @keyframes fadeUp { from{opacity:0;transform:translate(-50%,10px)} to{opacity:1;transform:translate(-50%,0)} }
        input::placeholder { color: rgba(139,115,85,0.6); }
        select option { background: #1a1a2e; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(201,169,110,0.3); border-radius: 2px; }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>
    </div>
  );
}
