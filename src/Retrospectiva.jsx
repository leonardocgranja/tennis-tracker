import { useState, useRef } from "react";

export function detectScenario(match) {
  const won = match.score.matchWinner === "p1";
  const isFinal = match.round === "Final";
  if (isFinal && won) return "final_win";
  if (isFinal && !won) return "final_loss";
  if (!won) return "loss_eliminated";
  return "win_continue";
}

function buildPrompt(scenario, match, tournamentHistory, athleteName, gender) {
  const isFemale = gender === "f";
  const formatSets = (sets) => sets.map((s, i) =>
    `${s.superTiebreak ? "Super Tie-Break" : "Set " + (i + 1)}: ${s.p1}-${s.p2}`
  ).join(", ");

  const matchSummary = `
Atleta: ${athleteName} (${isFemale ? "feminino" : "masculino"})
Adversária/o: ${match.p2Name}
Torneio: ${match.tournament}
Rodada: ${match.round}
Resultado: ${match.score.p1Sets}-${match.score.p2Sets} sets (${match.score.matchWinner === "p1" ? "vitória" : "derrota"})
Sets: ${formatSets(match.score.sets)}
Aces: ${match.stats.p1.aces} | Winners: ${match.stats.p1.winners} | Erros NF: ${match.stats.p1.unforced} | Pontos: ${match.stats.p1.points}
Superfície: ${match.surface}${match.location ? " | Local: " + match.location : ""}`.trim();

  const historyText = tournamentHistory && tournamentHistory.length > 1
    ? "\nPartidas anteriores no torneio:\n" + tournamentHistory
        .filter(m => m.id !== match.id)
        .map(m => `- ${m.round}: ${athleteName} ${m.score.matchWinner === "p1" ? "venceu" : "perdeu"} ${m.score.p1Sets}-${m.score.p2Sets} vs ${m.p2Name} | Aces: ${m.stats.p1.aces} | Winners: ${m.stats.p1.winners}`)
        .join("\n")
    : "";

  const instructions = {
    win_continue: `Escreva uma retrospectiva curta e animada dessa vitória (3 parágrafos). Tom: emotivo e esportivo. Celebre os destaques técnicos, mencione algum momento dramático se o placar indicar jogo disputado. Termine com entusiasmo para a próxima rodada.`,
    loss_eliminated: `Escreva uma retrospectiva positiva e inspiradora do torneio inteiro de ${athleteName} (4-5 parágrafos). Tom: encorajador — a derrota é só um detalhe, o foco são os pontos altos. Destaque aces, winners, rodadas vencidas. Termine com orgulho e motivação.`,
    final_win: `Escreva uma retrospectiva épica da conquista do campeonato por ${athleteName} (4-5 parágrafos). Tom: glorioso, emotivo e técnico. Comece com a vitória na final, depois percorra os melhores momentos do torneio. Termine com mensagem tocante para a família.`,
    final_loss: `Escreva uma retrospectiva calorosa da campanha de ${athleteName} até a final (4-5 parágrafos). Tom: orgulho genuíno — chegar à final já é conquista enorme. Comece com a final, depois celebre o caminho. Termine com mensagem emocionante de motivação.`,
  };

  return `Você é um narrador esportivo apaixonado por tênis juvenil. Escreva em português brasileiro, linguagem acessível e calorosa para pais e família. Não use asteriscos nem markdown.\n\n${matchSummary}${historyText}\n\n${instructions[scenario]}`;
}

export default function Retrospectiva({ match, tournamentHistory, scenario, athleteName, gender, onShare, onClose }) {
  const [phase, setPhase] = useState("idle");
  const [photo, setPhoto] = useState(null);
  const [retText, setRetText] = useState("");
  const [error, setError] = useState(null);
  const photoRef = useRef();
  const cameraRef = useRef();

  const isFemale = gender === "f";
  const championLabel = isFemale ? "campeã" : "campeão";

  async function generate() {
    setPhase("generating");
    setError(null);
    try {
      const prompt = buildPrompt(scenario, match, tournamentHistory, athleteName, gender);
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "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",
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || "API error " + response.status);
      }
      const data = await response.json();
      const generated = data.content?.map(b => b.text || "").join("") || "";
      if (!generated) throw new Error("vazio");
      setRetText(generated);
      setPhase("done");
    } catch (e) {
      console.error("Retrospectiva error:", e);
      setError(`Erro: ${e.message || "Não foi possível gerar. Tente novamente."}`);
      setPhase("idle");
    }
  }

  function handlePhotoFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setPhoto(ev.target.result); setPhase("idle"); };
    reader.readAsDataURL(file);
  }

  function shareWhatsApp() {
    const msg = `🎾 ${athleteName} — ${match.tournament}\n\n${retText}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }

  function shareTimeline() {
    if (onShare) onShare(`✨ Retrospectiva — ${match.tournament}\n\n${retText}`);
  }

  const gold = "#c9a96e", goldLight = "#e8c97a", purple = "#7c6f9e";
  const textColor = "#f0ede8", muted = "#8b7355";
  const bg = "#0d0d1a", card = "rgba(255,255,255,0.04)";

  const btn = (color = gold, ghost = false) => ({
    padding: "14px 20px", width: "100%",
    background: ghost ? "rgba(255,255,255,0.04)" : `linear-gradient(135deg,${color},${color}bb)`,
    color: ghost ? muted : color === gold ? "#0d0d1a" : "#fff",
    border: ghost ? "none" : "none",
    borderRadius: 12, fontWeight: 800, fontSize: 14,
    cursor: "pointer", letterSpacing: 0.3,
    boxShadow: ghost ? "none" : `0 4px 16px ${color}44`,
    transition: "all .2s", fontFamily: "Georgia, serif",
  });

  if (phase === "photo") return (
    <div style={{ minHeight:"100vh", background:bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"Georgia, serif", color:textColor }}>
      <div style={{ fontSize:48, marginBottom:16 }}>📸</div>
      <div style={{ fontSize:22, fontWeight:900, color:gold, marginBottom:8, textAlign:"center" }}>Foto {isFemale ? "da campeã" : "do campeão"}</div>
      <div style={{ color:muted, fontSize:14, marginBottom:32, textAlign:"center", maxWidth:300 }}>Adicione uma foto especial para a retrospectiva</div>
      <div style={{ width:"100%", maxWidth:360, display:"flex", flexDirection:"column", gap:12 }}>
        <button onClick={() => cameraRef.current.click()} style={btn("#4ade80")}>📸 Tirar foto agora</button>
        <button onClick={() => photoRef.current.click()} style={btn(purple)}>🖼️ Escolher da galeria</button>
        <button onClick={() => { setPhase("idle"); generate(); }} style={btn(muted, true)}>Continuar sem foto</button>
      </div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display:"none" }} onChange={handlePhotoFile} />
      <input ref={photoRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handlePhotoFile} />
      <button onClick={() => setPhase("idle")} style={{ marginTop:20, background:"transparent", border:"none", color:muted, fontSize:13, cursor:"pointer", fontFamily:"Georgia, serif" }}>← Voltar</button>
    </div>
  );

  if (phase === "generating") return (
    <div style={{ minHeight:"100vh", background:bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"Georgia, serif", color:textColor }}>
      <div style={{ fontSize:48, marginBottom:24, animation:"spin 2s linear infinite" }}>✨</div>
      <div style={{ fontSize:20, fontWeight:800, color:gold, marginBottom:8, textAlign:"center" }}>Gerando retrospectiva...</div>
      <div style={{ color:muted, fontSize:14, textAlign:"center", maxWidth:280, lineHeight:1.6 }}>A IA está escrevendo um resumo especial da campanha de {athleteName}</div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:bg, color:textColor, fontFamily:"Georgia, serif", backgroundImage:"radial-gradient(ellipse at 20% 20%, rgba(124,111,158,0.12) 0%, transparent 60%)" }}>
      <div style={{ background:"rgba(13,13,26,0.95)", backdropFilter:"blur(20px)", borderBottom:`1px solid rgba(201,169,110,0.2)`, padding:"16px 20px", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ maxWidth:700, margin:"0 auto", display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:muted, cursor:"pointer", fontSize:13, fontFamily:"Georgia, serif" }}>← Voltar</button>
          <div style={{ flex:1, textAlign:"center" }}>
            <div style={{ color:gold, fontWeight:800, fontSize:15 }}>
              {scenario === "final_win" ? "🏆 Retrospectiva da Campeã" : scenario === "final_loss" ? "🌟 Retrospectiva do Torneio" : scenario === "loss_eliminated" ? "💪 Retrospectiva do Torneio" : "🎾 Retrospectiva da Partida"}
            </div>
            <div style={{ color:muted, fontSize:11 }}>{match.tournament} · {match.round}</div>
          </div>
          <div style={{ width:60 }} />
        </div>
      </div>

      <div style={{ maxWidth:700, margin:"0 auto", padding:"20px 16px" }}>
        {photo && (
          <div style={{ borderRadius:20, overflow:"hidden", marginBottom:20, position:"relative" }}>
            <img src={photo} alt="Foto" style={{ width:"100%", maxHeight:300, objectFit:"cover", display:"block" }} />
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(13,13,26,0.7) 0%, transparent 50%)" }} />
            <div style={{ position:"absolute", bottom:16, left:16, color:"#fff", fontWeight:800, fontSize:18, textShadow:"0 2px 8px rgba(0,0,0,0.8)" }}>{athleteName} 🎾</div>
            <button onClick={() => setPhoto(null)} style={{ position:"absolute", top:12, right:12, background:"rgba(0,0,0,0.5)", border:"none", borderRadius:"50%", width:28, height:28, color:"#fff", cursor:"pointer", fontSize:14 }}>✕</button>
          </div>
        )}

        {phase === "idle" && !retText && (
          <div style={{ background:card, border:`1px solid rgba(201,169,110,0.2)`, borderRadius:20, padding:28, textAlign:"center" }}>
            <div style={{ fontSize:52, marginBottom:16 }}>{scenario === "final_win" ? "🏆" : scenario === "win_continue" ? "🎾" : "💪"}</div>
            <div style={{ color:gold, fontWeight:800, fontSize:20, marginBottom:8 }}>
              {scenario === "final_win" ? `${athleteName} é ${championLabel}!` : scenario === "win_continue" ? `Vitória de ${athleteName}!` : scenario === "final_loss" ? "Que campanha incrível!" : "Um torneio para lembrar"}
            </div>
            <div style={{ color:muted, fontSize:14, marginBottom:28, lineHeight:1.6 }}>
              {scenario === "win_continue" ? "Gere um resumo dessa vitória para compartilhar com a torcida." : "Gere uma retrospectiva especial para celebrar essa campanha."}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {scenario === "final_win" && (
                <button onClick={() => setPhase("photo")} style={btn("#4ade80")}>📸 Adicionar foto {isFemale ? "da campeã" : "do campeão"}</button>
              )}
              <button onClick={generate} style={btn()}>✨ Gerar Retrospectiva</button>
              {error && <div style={{ color:"#e05050", fontSize:13 }}>{error}</div>}
            </div>
          </div>
        )}

        {phase === "done" && retText && (
          <div>
            <div style={{ background:card, border:`1px solid rgba(201,169,110,0.2)`, borderRadius:20, padding:24, marginBottom:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
                <div style={{ color:gold, fontWeight:700, fontSize:12, letterSpacing:1 }}>RETROSPECTIVA</div>
                <div style={{ color:muted, fontSize:11 }}>{new Date().toLocaleDateString("pt-BR", { day:"numeric", month:"long", year:"numeric" })}</div>
              </div>
              <div style={{ fontSize:15, lineHeight:1.85, color:textColor, whiteSpace:"pre-wrap" }}>{retText}</div>
            </div>

            <div style={{ background:"rgba(201,169,110,0.06)", border:`1px solid rgba(201,169,110,0.15)`, borderRadius:16, padding:16, marginBottom:20 }}>
              <div style={{ color:gold, fontWeight:700, fontSize:11, letterSpacing:1, marginBottom:12 }}>NÚMEROS DA PARTIDA</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                {[{ label:"Aces", v:match.stats.p1.aces },{ label:"Winners", v:match.stats.p1.winners },{ label:"Pontos", v:match.stats.p1.points }].map(s => (
                  <div key={s.label} style={{ textAlign:"center", background:"rgba(255,255,255,0.03)", borderRadius:10, padding:"10px 6px" }}>
                    <div style={{ fontSize:22, fontWeight:900, color:goldLight }}>{s.v}</div>
                    <div style={{ fontSize:10, color:muted, textTransform:"uppercase", letterSpacing:0.5 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <button onClick={shareWhatsApp} style={btn("#25D366")}>💬 Compartilhar no WhatsApp</button>
              <button onClick={shareTimeline} style={btn(purple)}>📢 Postar na transmissão ao vivo</button>
              {!photo && scenario === "final_win" && (
                <button onClick={() => setPhase("photo")} style={{ ...btn(gold, true), border:`1px solid rgba(201,169,110,0.3)`, color:gold }}>
                  📸 Adicionar foto {isFemale ? "da campeã" : "do campeão"}
                </button>
              )}
              <button onClick={() => { setRetText(""); setPhase("idle"); }} style={btn(muted, true)}>🔄 Gerar novamente</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
