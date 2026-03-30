import { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "tennis-match-data";

// ─── helpers ────────────────────────────────────────────────────────────────
const TENNIS_POINTS = ["0", "15", "30", "40", "AD"];

function calcPoint(score, winner) {
  const s = { ...score };
  const opp = winner === "p1" ? "p2" : "p1";
  const wp = s[winner + "Points"];
  const op = s[opp + "Points"];

  // deuce / advantage logic
  if (wp === 3 && op === 3) { s[winner + "Points"] = 4; return s; } // AD
  if (wp === 4) { // AD holder wins
    s[winner + "Games"]++;
    s.p1Points = 0; s.p2Points = 0;
    return checkSet(s, winner);
  }
  if (op === 4) { // AD holder loses → back to deuce
    s[winner + "Points"] = 3; s[opp + "Points"] = 3; return s;
  }
  if (wp === 3 && op < 3) { // 40 and other not at 40 → game
    s[winner + "Games"]++;
    s.p1Points = 0; s.p2Points = 0;
    return checkSet(s, winner);
  }
  s[winner + "Points"]++;
  return s;
}

function checkSet(s, winner) {
  const opp = winner === "p1" ? "p2" : "p1";
  const wg = s[winner + "Games"];
  const og = s[opp + "Games"];
  if ((wg >= 6 && wg - og >= 2) || wg === 7) {
    s[winner + "Sets"]++;
    s.sets.push({ p1: s.p1Games, p2: s.p2Games });
    s.p1Games = 0; s.p2Games = 0;
  }
  return s;
}

const emptyStats = () => ({
  aces: 0, winners: 0, unforced: 0, points: 0
});

const emptyScore = () => ({
  p1Points: 0, p2Points: 0,
  p1Games: 0, p2Games: 0,
  p1Sets: 0, p2Sets: 0,
  sets: []
});

// ─── components ─────────────────────────────────────────────────────────────

function Avatar({ src, name, size = 80 }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: src ? "transparent" : "linear-gradient(135deg,#c9a96e,#8b6914)",
      border: "3px solid #c9a96e",
      overflow: "hidden", display: "flex", alignItems: "center",
      justifyContent: "center", flexShrink: 0,
      boxShadow: "0 4px 20px rgba(201,169,110,0.35)"
    }}>
      {src
        ? <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <span style={{ color: "#fff", fontWeight: 700, fontSize: size * 0.32, fontFamily: "serif" }}>{initials}</span>
      }
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

// ─── main app ────────────────────────────────────────────────────────────────
export default function TennisApp() {
  const [tab, setTab] = useState("placar");
  const [matchState, setMatchState] = useState("idle"); // idle | active | finished
  const [score, setScore] = useState(emptyScore());
  const [stats, setStats] = useState({ p1: emptyStats(), p2: emptyStats() });
  const [rally, setRally] = useState(null); // {winner} waiting for shot type
  const [events, setEvents] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentName, setCommentName] = useState("");
  const [likes, setLikes] = useState(0);
  const [location, setLocation] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [p1Photo, setP1Photo] = useState(null);
  const [p2Photo, setP2Photo] = useState(null);
  const [p1Name, setP1Name] = useState("Maria Amélia");
  const [p2Name, setP2Name] = useState("Adversária");
  const [surface, setSurface] = useState("Saibro");
  const [tournament, setTournament] = useState("");
  const [editingProfiles, setEditingProfiles] = useState(false);
  const p1PhotoRef = useRef();
  const p2PhotoRef = useRef();
  const commentsEndRef = useRef();

  // persist
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (saved.score) setScore(saved.score);
      if (saved.stats) setStats(saved.stats);
      if (saved.events) setEvents(saved.events);
      if (saved.comments) setComments(saved.comments);
      if (saved.likes) setLikes(saved.likes);
      if (saved.matchState) setMatchState(saved.matchState);
      if (saved.p1Name) setP1Name(saved.p1Name);
      if (saved.p2Name) setP2Name(saved.p2Name);
      if (saved.surface) setSurface(saved.surface);
      if (saved.tournament) setTournament(saved.tournament);
      if (saved.weather) setWeather(saved.weather);
      if (saved.location) setLocation(saved.location);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        score, stats, events, comments, likes, matchState,
        p1Name, p2Name, surface, tournament, weather, location
      }));
    } catch {}
  }, [score, stats, events, comments, likes, matchState, p1Name, p2Name, surface, tournament, weather, location]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  async function handleCheckin() {
    setLoadingWeather(true);
    try {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m&timezone=auto`
        );
        const data = await res.json();
        const cw = data.current_weather;
        const locRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
        );
        const locData = await locRes.json();
        const city = locData.address?.city || locData.address?.town || locData.address?.village || "Localização";
        const state = locData.address?.state || "";
        setLocation(`${city}${state ? ", " + state : ""}`);
        setWeather({ temp: Math.round(cw.temperature), wind: Math.round(cw.windspeed), code: cw.weathercode });
        setLoadingWeather(false);
      }, () => {
        setLocation("Localização não disponível");
        setLoadingWeather(false);
      });
    } catch {
      setLoadingWeather(false);
    }
  }

  function weatherIcon(code) {
    if (code === 0) return "☀️";
    if (code <= 3) return "⛅";
    if (code <= 67) return "🌧️";
    if (code <= 77) return "❄️";
    return "⛈️";
  }

  function handlePoint(winner) {
    setRally({ winner });
  }

  function handleShot(type) {
    const w = rally.winner;
    const newScore = calcPoint({ ...score }, w);
    const newStats = {
      p1: { ...stats.p1 },
      p2: { ...stats.p2 }
    };
    newStats[w].points++;
    if (type === "ace") newStats[w].aces++;
    if (type === "winner") newStats[w].winners++;
    if (type === "unforced") {
      const opp = w === "p1" ? "p2" : "p1";
      newStats[opp].unforced++;
    }

    const shotLabels = { ace: "🎯 ACE", winner: "⚡ Winner", point: "✅ Ponto", unforced: "❌ Erro não forçado" };
    const wName = w === "p1" ? p1Name : p2Name;
    const eventText = type === "unforced"
      ? `Erro não forçado de ${w === "p1" ? p2Name : p1Name} → ponto para ${wName}`
      : `${shotLabels[type]} de ${wName}`;

    setEvents(prev => [{ text: eventText, time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) }, ...prev].slice(0, 50));
    setScore(newScore);
    setStats(newStats);
    setRally(null);
  }

  function handlePhotoUpload(player, e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (player === "p1") setP1Photo(ev.target.result);
      else setP2Photo(ev.target.result);
    };
    reader.readAsDataURL(file);
  }

  function postComment() {
    if (!commentText.trim()) return;
    setComments(prev => [...prev, {
      name: commentName.trim() || "Torcedor",
      text: commentText.trim(),
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      id: Date.now()
    }]);
    setCommentText("");
  }

  function resetMatch() {
    setScore(emptyScore());
    setStats({ p1: emptyStats(), p2: emptyStats() });
    setEvents([]);
    setRally(null);
    setMatchState("idle");
  }

  const pt = (p) => TENNIS_POINTS[p] || p;

  // ─── styles ───────────────────────────────────────────────────────────────
  const bg = "#0d0d1a";
  const card = "rgba(255,255,255,0.04)";
  const gold = "#c9a96e";
  const goldLight = "#e8c97a";
  const purple = "#7c6f9e";
  const text = "#f0ede8";
  const muted = "#8b7355";

  const tabStyle = (t) => ({
    padding: "10px 18px",
    border: "none",
    background: tab === t ? "linear-gradient(135deg,#c9a96e,#8b6914)" : "transparent",
    color: tab === t ? "#0d0d1a" : muted,
    fontWeight: tab === t ? 800 : 500,
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 13,
    letterSpacing: 0.5,
    transition: "all .2s",
    fontFamily: "Georgia, serif"
  });

  const btnStyle = (color = gold) => ({
    padding: "14px 24px",
    background: `linear-gradient(135deg,${color},${color}bb)`,
    color: color === gold ? "#0d0d1a" : "#fff",
    border: "none",
    borderRadius: 12,
    fontWeight: 800,
    fontSize: 15,
    cursor: "pointer",
    letterSpacing: 0.5,
    boxShadow: `0 4px 20px ${color}44`,
    transition: "transform .15s, box-shadow .15s",
    fontFamily: "Georgia, serif"
  });

  return (
    <div style={{
      minHeight: "100vh", background: bg, color: text,
      fontFamily: "'Georgia', serif",
      backgroundImage: "radial-gradient(ellipse at 20% 20%, rgba(124,111,158,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(201,169,110,0.08) 0%, transparent 60%)"
    }}>
      {/* header */}
      <div style={{
        background: "rgba(13,13,26,0.95)", backdropFilter: "blur(20px)",
        borderBottom: `1px solid rgba(201,169,110,0.2)`,
        padding: "16px 20px", position: "sticky", top: 0, zIndex: 100
      }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 24 }}>🎾</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, color: gold, letterSpacing: 1 }}>
                {tournament || "Tênis ao Vivo"}
              </div>
              <div style={{ fontSize: 12, color: muted }}>
                {surface} {location && `· ${location}`} {weather && `· ${weatherIcon(weather.code)} ${weather.temp}°C`}
              </div>
            </div>
            {matchState === "active" && (
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", animation: "pulse 1.5s infinite" }} />
                <span style={{ fontSize: 12, color: "#4ade80", fontWeight: 700 }}>AO VIVO</span>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["placar", "controle", "estatísticas", "torcida", "perfis"].map(t => (
              <button key={t} style={tabStyle(t)} onClick={() => setTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "20px 16px" }}>

        {/* ── PLACAR ── */}
        {tab === "placar" && (
          <div>
            {/* scoreboard */}
            <div style={{ background: card, border: `1px solid rgba(201,169,110,0.2)`, borderRadius: 20, padding: 24, marginBottom: 20, backdropFilter: "blur(10px)" }}>
              {/* sets */}
              {score.sets.length > 0 && (
                <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 20 }}>
                  {score.sets.map((s, i) => (
                    <div key={i} style={{ textAlign: "center", opacity: 0.6, fontSize: 13 }}>
                      <div style={{ color: muted, fontSize: 10, marginBottom: 4 }}>SET {i + 1}</div>
                      <div>{s.p1} – {s.p2}</div>
                    </div>
                  ))}
                </div>
              )}

              {[{ key: "p1", name: p1Name, photo: p1Photo }, { key: "p2", name: p2Name, photo: p2Photo }].map((p, i) => (
                <div key={p.key}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 0" }}>
                    <Avatar src={p.photo} name={p.name} size={52} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{p.name}</div>
                      <div style={{ color: muted, fontSize: 12 }}>{stats[p.key].aces} aces · {stats[p.key].winners} winners</div>
                    </div>
                    <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ color: muted, fontSize: 10, marginBottom: 2 }}>SETS</div>
                        <div style={{ fontSize: 28, fontWeight: 900, color: gold }}>{score[p.key + "Sets"]}</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ color: muted, fontSize: 10, marginBottom: 2 }}>GAMES</div>
                        <div style={{ fontSize: 28, fontWeight: 900 }}>{score[p.key + "Games"]}</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ color: muted, fontSize: 10, marginBottom: 2 }}>PONTOS</div>
                        <div style={{ fontSize: 28, fontWeight: 900, color: p.key === "p1" && score.p1Points > score.p2Points ? goldLight : p.key === "p2" && score.p2Points > score.p1Points ? goldLight : text }}>
                          {pt(score[p.key + "Points"])}
                        </div>
                      </div>
                    </div>
                  </div>
                  {i === 0 && <div style={{ height: 1, background: "rgba(201,169,110,0.1)" }} />}
                </div>
              ))}
            </div>

            {/* likes */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              <button onClick={() => setLikes(l => l + 1)} style={{
                ...btnStyle(purple), display: "flex", alignItems: "center", gap: 8, flex: 1, justifyContent: "center"
              }}>
                ❤️ {likes} curtidas
              </button>
            </div>

            {/* event log */}
            <div style={{ background: card, border: `1px solid rgba(201,169,110,0.1)`, borderRadius: 16, padding: 16 }}>
              <div style={{ color: gold, fontWeight: 700, marginBottom: 12, fontSize: 13, letterSpacing: 1 }}>HISTÓRICO DE PONTOS</div>
              {events.length === 0
                ? <div style={{ color: muted, fontSize: 13, textAlign: "center", padding: "20px 0" }}>Nenhum ponto registrado ainda</div>
                : events.map((e, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: i < events.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <span style={{ color: muted, fontSize: 11, minWidth: 40 }}>{e.time}</span>
                    <span style={{ fontSize: 13 }}>{e.text}</span>
                  </div>
                ))
              }
            </div>

            {/* comments */}
            <div style={{ background: card, border: `1px solid rgba(201,169,110,0.1)`, borderRadius: 16, padding: 16, marginTop: 20 }}>
              <div style={{ color: gold, fontWeight: 700, marginBottom: 12, fontSize: 13, letterSpacing: 1 }}>COMENTÁRIOS DA TORCIDA</div>
              <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 12 }}>
                {comments.length === 0
                  ? <div style={{ color: muted, fontSize: 13, textAlign: "center", padding: "12px 0" }}>Seja o primeiro a comentar!</div>
                  : comments.map(c => (
                    <div key={c.id} style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                        <span style={{ color: gold, fontWeight: 700, fontSize: 13 }}>{c.name}</span>
                        <span style={{ color: muted, fontSize: 10 }}>{c.time}</span>
                      </div>
                      <div style={{ fontSize: 13, marginTop: 2 }}>{c.text}</div>
                    </div>
                  ))
                }
                <div ref={commentsEndRef} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={commentName} onChange={e => setCommentName(e.target.value)} placeholder="Seu nome"
                  style={{ width: 100, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(201,169,110,0.2)", color: text, fontSize: 13, fontFamily: "Georgia, serif" }} />
                <input value={commentText} onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && postComment()}
                  placeholder="Comentar..."
                  style={{ flex: 1, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(201,169,110,0.2)", color: text, fontSize: 13, fontFamily: "Georgia, serif" }} />
                <button onClick={postComment} style={{ ...btnStyle(), padding: "8px 16px", fontSize: 13 }}>Enviar</button>
              </div>
            </div>
          </div>
        )}

        {/* ── CONTROLE ── */}
        {tab === "controle" && (
          <div>
            {matchState === "idle" && (
              <div style={{ background: card, border: `1px solid rgba(201,169,110,0.2)`, borderRadius: 20, padding: 24, marginBottom: 20 }}>
                <div style={{ color: gold, fontWeight: 700, marginBottom: 16, fontSize: 14, letterSpacing: 1 }}>CHECK-IN DA PARTIDA</div>
                <input value={tournament} onChange={e => setTournament(e.target.value)}
                  placeholder="Nome do torneio / evento"
                  style={{ width: "100%", padding: "12px 16px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(201,169,110,0.2)", color: text, fontSize: 14, marginBottom: 12, boxSizing: "border-box", fontFamily: "Georgia, serif" }} />
                <select value={surface} onChange={e => setSurface(e.target.value)}
                  style={{ width: "100%", padding: "12px 16px", borderRadius: 10, background: "#1a1a2e", border: "1px solid rgba(201,169,110,0.2)", color: text, fontSize: 14, marginBottom: 16, fontFamily: "Georgia, serif" }}>
                  {["Saibro", "Quadra dura", "Grama", "Carpete"].map(s => <option key={s}>{s}</option>)}
                </select>
                <button onClick={handleCheckin} disabled={loadingWeather}
                  style={{ ...btnStyle(purple), width: "100%", marginBottom: 12, opacity: loadingWeather ? 0.6 : 1 }}>
                  {loadingWeather ? "Obtendo localização..." : "📍 Fazer Check-in (localização + clima)"}
                </button>
                {weather && (
                  <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 12, fontSize: 13, color: gold, textAlign: "center" }}>
                    {weatherIcon(weather.code)} {weather.temp}°C · 💨 {weather.wind} km/h · {location}
                  </div>
                )}
                <button onClick={() => setMatchState("active")}
                  style={{ ...btnStyle(), width: "100%", marginTop: 12, fontSize: 16, padding: "16px" }}>
                  🎾 Iniciar Partida
                </button>
              </div>
            )}

            {matchState === "active" && !rally && (
              <div>
                <div style={{ color: gold, fontWeight: 700, marginBottom: 16, fontSize: 14, letterSpacing: 1, textAlign: "center" }}>
                  QUEM FEZ O PONTO?
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                  {[{ key: "p1", name: p1Name, photo: p1Photo }, { key: "p2", name: p2Name, photo: p2Photo }].map(p => (
                    <button key={p.key} onClick={() => handlePoint(p.key)} style={{
                      background: "rgba(255,255,255,0.04)", border: `2px solid rgba(201,169,110,0.3)`,
                      borderRadius: 16, padding: 20, cursor: "pointer", display: "flex",
                      flexDirection: "column", alignItems: "center", gap: 10,
                      transition: "all .2s", color: text
                    }}
                      onMouseEnter={e => e.currentTarget.style.border = `2px solid ${gold}`}
                      onMouseLeave={e => e.currentTarget.style.border = `2px solid rgba(201,169,110,0.3)`}
                    >
                      <Avatar src={p.photo} name={p.name} size={60} />
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</span>
                      <div style={{ fontSize: 22, fontWeight: 900, color: gold }}>{pt(score[p.key + "Points"])}</div>
                    </button>
                  ))}
                </div>
                <div style={{ textAlign: "center", background: card, borderRadius: 12, padding: 12, fontSize: 13, color: muted }}>
                  Sets: {score.p1Sets}–{score.p2Sets} · Games: {score.p1Games}–{score.p2Games}
                </div>
                <button onClick={resetMatch} style={{ ...btnStyle("#e05050"), width: "100%", marginTop: 16, fontSize: 14 }}>
                  🔄 Resetar Partida
                </button>
              </div>
            )}

            {matchState === "active" && rally && (
              <div>
                <div style={{ color: gold, fontWeight: 700, marginBottom: 8, fontSize: 14, letterSpacing: 1, textAlign: "center" }}>
                  COMO FOI O PONTO?
                </div>
                <div style={{ color: muted, fontSize: 13, textAlign: "center", marginBottom: 20 }}>
                  Ponto para: <strong style={{ color: text }}>{rally.winner === "p1" ? p1Name : p2Name}</strong>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { key: "ace", label: "🎯 ACE", desc: "Serviço não tocado", color: "#4ade80" },
                    { key: "winner", label: "⚡ Winner", desc: "Bola vencedora", color: goldLight },
                    { key: "point", label: "✅ Ponto", desc: "Rali normal", color: purple },
                    { key: "unforced", label: "❌ Erro NF", desc: "Erro não forçado (adversária)", color: "#e05050" },
                  ].map(s => (
                    <button key={s.key} onClick={() => handleShot(s.key)} style={{
                      background: "rgba(255,255,255,0.04)", border: `2px solid ${s.color}44`,
                      borderRadius: 16, padding: "18px 12px", cursor: "pointer",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                      transition: "all .2s", color: text
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = `${s.color}18`}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                    >
                      <span style={{ fontSize: 22 }}>{s.label.split(" ")[0]}</span>
                      <span style={{ fontWeight: 700, color: s.color, fontSize: 14 }}>{s.label.split(" ").slice(1).join(" ")}</span>
                      <span style={{ fontSize: 11, color: muted }}>{s.desc}</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => setRally(null)} style={{ ...btnStyle(muted), width: "100%", marginTop: 16, fontSize: 13, background: "rgba(255,255,255,0.06)", color: muted, boxShadow: "none" }}>
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
                <div style={{ textAlign: "center" }}>
                  <Avatar src={p1Photo} name={p1Name} size={44} />
                  <div style={{ fontSize: 12, marginTop: 6, fontWeight: 700 }}>{p1Name}</div>
                </div>
                <div style={{ textAlign: "center", alignSelf: "center" }}>
                  <div style={{ color: muted, fontSize: 11, marginBottom: 4 }}>PLACAR</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: gold }}>{score.p1Sets} – {score.p2Sets}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <Avatar src={p2Photo} name={p2Name} size={44} />
                  <div style={{ fontSize: 12, marginTop: 6, fontWeight: 700 }}>{p2Name}</div>
                </div>
              </div>
              <StatBar label="Aces" v1={stats.p1.aces} v2={stats.p2.aces} />
              <StatBar label="Winners" v1={stats.p1.winners} v2={stats.p2.winners} />
              <StatBar label="Erros NF" v1={stats.p1.unforced} v2={stats.p2.unforced} />
              <StatBar label="Pontos" v1={stats.p1.points} v2={stats.p2.points} />
            </div>

            {/* per set */}
            {score.sets.length > 0 && (
              <div style={{ background: card, border: `1px solid rgba(201,169,110,0.1)`, borderRadius: 16, padding: 16 }}>
                <div style={{ color: gold, fontWeight: 700, marginBottom: 12, fontSize: 13, letterSpacing: 1 }}>SETS DISPUTADOS</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ color: muted, fontSize: 11 }}>
                      <td style={{ padding: "6px 0" }}>SET</td>
                      <td style={{ textAlign: "center" }}>{p1Name.split(" ")[0]}</td>
                      <td style={{ textAlign: "center" }}>{p2Name.split(" ")[0]}</td>
                    </tr>
                  </thead>
                  <tbody>
                    {score.sets.map((s, i) => (
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
              <button onClick={() => setLikes(l => l + 1)} style={{ ...btnStyle(), width: "100%", fontSize: 18, padding: 20 }}>
                ❤️ Torcer! ({likes})
              </button>
            </div>
            <div style={{ background: card, border: `1px solid rgba(201,169,110,0.1)`, borderRadius: 16, padding: 16 }}>
              <div style={{ color: gold, fontWeight: 700, marginBottom: 12, fontSize: 13, letterSpacing: 1 }}>COMENTÁRIOS</div>
              <div style={{ maxHeight: 320, overflowY: "auto", marginBottom: 16 }}>
                {comments.length === 0
                  ? <div style={{ color: muted, fontSize: 13, textAlign: "center", padding: "24px 0" }}>Nenhum comentário ainda. Seja o primeiro! 🎾</div>
                  : comments.map(c => (
                    <div key={c.id} style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                        <span style={{ color: gold, fontWeight: 700, fontSize: 13 }}>{c.name}</span>
                        <span style={{ color: muted, fontSize: 10 }}>{c.time}</span>
                      </div>
                      <div style={{ fontSize: 14, marginTop: 3 }}>{c.text}</div>
                    </div>
                  ))
                }
                <div ref={commentsEndRef} />
              </div>
              <input value={commentName} onChange={e => setCommentName(e.target.value)}
                placeholder="Seu nome"
                style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(201,169,110,0.2)", color: text, fontSize: 14, marginBottom: 8, boxSizing: "border-box", fontFamily: "Georgia, serif" }} />
              <div style={{ display: "flex", gap: 8 }}>
                <input value={commentText} onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && postComment()}
                  placeholder="Escreva um comentário..."
                  style={{ flex: 1, padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(201,169,110,0.2)", color: text, fontSize: 14, fontFamily: "Georgia, serif" }} />
                <button onClick={postComment} style={{ ...btnStyle(), padding: "10px 18px" }}>→</button>
              </div>
            </div>
          </div>
        )}

        {/* ── PERFIS ── */}
        {tab === "perfis" && (
          <div>
            {[
              { key: "p1", name: p1Name, setName: setP1Name, photo: p1Photo, ref: p1PhotoRef, player: "p1" },
              { key: "p2", name: p2Name, setName: setP2Name, photo: p2Photo, ref: p2PhotoRef, player: "p2" },
            ].map((p, i) => (
              <div key={p.key} style={{ background: card, border: `1px solid rgba(201,169,110,0.2)`, borderRadius: 20, padding: 24, marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
                  <div style={{ position: "relative", cursor: "pointer" }} onClick={() => p.ref.current.click()}>
                    <Avatar src={p.photo} name={p.name} size={72} />
                    <div style={{ position: "absolute", bottom: 0, right: 0, width: 22, height: 22, borderRadius: "50%", background: gold, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>📷</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <input value={p.name} onChange={e => p.setName(e.target.value)}
                      style={{ width: "100%", background: "transparent", border: "none", borderBottom: `1px solid rgba(201,169,110,0.3)`, color: text, fontSize: 18, fontWeight: 700, padding: "4px 0", fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box" }} />
                    <div style={{ color: muted, fontSize: 12, marginTop: 4 }}>{i === 0 ? "Jogadora principal" : "Adversária"}</div>
                  </div>
                  <input ref={p.ref} type="file" accept="image/*" style={{ display: "none" }}
                    onChange={e => handlePhotoUpload(p.player, e)} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { label: "Sets", v: score[p.key + "Sets"] },
                    { label: "Games", v: score[p.key + "Games"] },
                    { label: "Aces", v: stats[p.key].aces },
                    { label: "Winners", v: stats[p.key].winners },
                    { label: "Pontos", v: stats[p.key].points },
                    { label: "Erros NF", v: stats[p.key].unforced },
                  ].map(stat => (
                    <div key={stat.label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "10px 14px" }}>
                      <div style={{ color: muted, fontSize: 10, letterSpacing: 1 }}>{stat.label.toUpperCase()}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: gold }}>{stat.v}</div>
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
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
        input::placeholder { color: rgba(139,115,85,0.6); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(201,169,110,0.3); border-radius: 2px; }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>
    </div>
  );
}
