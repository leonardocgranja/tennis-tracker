import { useState, useEffect, useRef } from "react";

const STEPS = 4;

// ─── Animations ──────────────────────────────────────────────────────────────
const fadeSlide = `
  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeSlideOut {
    from { opacity: 1; transform: translateY(0); }
    to   { opacity: 0; transform: translateY(-24px); }
  }
  @keyframes popIn {
    0%   { transform: scale(0.8); opacity: 0; }
    70%  { transform: scale(1.05); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.6; transform: scale(1.08); }
  }
  @keyframes bounceIn {
    0%   { transform: scale(0); opacity: 0; }
    60%  { transform: scale(1.15); opacity: 1; }
    100% { transform: scale(1); }
  }
`;

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ step }) {
  return (
    <div style={{ padding: "0 0 32px 0" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
        {Array.from({ length: STEPS }).map((_, i) => (
          <div key={i} style={{
            height: 4,
            width: i < step ? 48 : 28,
            borderRadius: 99,
            background: i < step
              ? "linear-gradient(90deg, #c9a96e, #e8c97a)"
              : i === step
                ? "rgba(201,169,110,0.35)"
                : "rgba(255,255,255,0.08)",
            transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }} />
        ))}
      </div>
      <div style={{ textAlign: "center", fontSize: 11, color: "rgba(201,169,110,0.5)", letterSpacing: 2, textTransform: "uppercase" }}>
        Passo {step + 1} de {STEPS}
      </div>
    </div>
  );
}

// ─── Gender Card ──────────────────────────────────────────────────────────────
function GenderCard({ emoji, label, selected, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex: 1,
      padding: "28px 16px",
      border: `2px solid ${selected ? "#c9a96e" : "rgba(255,255,255,0.08)"}`,
      borderRadius: 20,
      background: selected
        ? "linear-gradient(135deg, rgba(201,169,110,0.18), rgba(201,169,110,0.06))"
        : "rgba(255,255,255,0.03)",
      cursor: "pointer",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 12,
      transition: "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
      transform: selected ? "scale(1.04)" : "scale(1)",
      boxShadow: selected ? "0 8px 32px rgba(201,169,110,0.2)" : "none",
    }}>
      <div style={{ fontSize: 52, lineHeight: 1, animation: selected ? "bounceIn 0.4s ease" : "none" }}>{emoji}</div>
      <div style={{
        color: selected ? "#c9a96e" : "rgba(240,237,232,0.5)",
        fontWeight: selected ? 800 : 500,
        fontSize: 15,
        fontFamily: "Georgia, serif",
        letterSpacing: 0.5,
        transition: "all 0.2s"
      }}>{label}</div>
      {selected && (
        <div style={{
          width: 22, height: 22, borderRadius: "50%",
          background: "linear-gradient(135deg, #c9a96e, #e8c97a)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, animation: "popIn 0.3s ease"
        }}>✓</div>
      )}
    </button>
  );
}

// ─── Step wrapper with animation ─────────────────────────────────────────────
function StepWrapper({ children, stepKey }) {
  return (
    <div key={stepKey} style={{ animation: "fadeSlideIn 0.4s ease forwards" }}>
      {children}
    </div>
  );
}

// ─── Main Onboarding ──────────────────────────────────────────────────────────
export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [adminName, setAdminName] = useState("");
  const [gender, setGender] = useState(null); // "f" | "m"
  const [athleteName, setAthleteName] = useState("");
  const [animating, setAnimating] = useState(false);
  const inputRef = useRef(null);

  const isFemale = gender === "f";
  const athleteLabel = isFemale ? "tenista" : "tenista";
  const championLabel = isFemale ? "campeã" : "campeão";
  const herHim = isFemale ? "ela" : "ele";
  const herHisName = athleteName || (isFemale ? "sua atleta" : "seu atleta");

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 400);
  }, [step]);

  function goNext() {
    setAnimating(true);
    setTimeout(() => { setStep(s => s + 1); setAnimating(false); }, 200);
  }

  function handleComplete() {
    onComplete({ adminName, gender, athleteName });
  }

  // ─── Colors ───────────────────────────────────────────────────────────────
  const gold = "#c9a96e";
  const goldLight = "#e8c97a";
  const text = "#f0ede8";
  const muted = "rgba(240,237,232,0.45)";
  const bg = "#0d0d1a";

  const inputStyle = {
    width: "100%",
    padding: "16px 20px",
    borderRadius: 14,
    background: "rgba(255,255,255,0.05)",
    border: "1.5px solid rgba(201,169,110,0.25)",
    color: text,
    fontSize: 18,
    fontFamily: "Georgia, serif",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };

  const primaryBtn = (disabled = false) => ({
    width: "100%",
    padding: "16px",
    borderRadius: 14,
    background: disabled
      ? "rgba(201,169,110,0.2)"
      : "linear-gradient(135deg, #c9a96e, #e8c97a)",
    border: "none",
    color: disabled ? "rgba(201,169,110,0.4)" : "#0d0d1a",
    fontWeight: 800,
    fontSize: 16,
    fontFamily: "Georgia, serif",
    cursor: disabled ? "not-allowed" : "pointer",
    letterSpacing: 0.5,
    transition: "all 0.2s",
    boxShadow: disabled ? "none" : "0 4px 24px rgba(201,169,110,0.35)",
  });

  const questionStyle = {
    fontSize: 26,
    fontWeight: 900,
    color: text,
    fontFamily: "Georgia, serif",
    lineHeight: 1.3,
    marginBottom: 8,
  };

  const subStyle = {
    fontSize: 14,
    color: muted,
    marginBottom: 28,
    lineHeight: 1.6,
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: bg,
      backgroundImage: "radial-gradient(ellipse at 15% 15%, rgba(124,111,158,0.18) 0%, transparent 55%), radial-gradient(ellipse at 85% 85%, rgba(201,169,110,0.1) 0%, transparent 55%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 20px",
      fontFamily: "Georgia, serif",
      color: text,
    }}>
      <style>{fadeSlide}</style>

      {/* Logo */}
      <div style={{ marginBottom: 40, textAlign: "center", animation: "fadeSlideIn 0.5s ease" }}>
        <div style={{ fontSize: 44, marginBottom: 8 }}>🎾</div>
        <div style={{
          fontSize: 13,
          letterSpacing: 3,
          textTransform: "uppercase",
          background: "linear-gradient(90deg, #c9a96e, #e8c97a, #c9a96e)",
          backgroundSize: "200% auto",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          animation: "shimmer 3s linear infinite",
          fontWeight: 700,
        }}>Tennis Tracker</div>
      </div>

      {/* Card */}
      <div style={{
        width: "100%",
        maxWidth: 420,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(201,169,110,0.15)",
        borderRadius: 24,
        padding: "32px 28px",
        backdropFilter: "blur(20px)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
      }}>
        <ProgressBar step={step} />

        {/* ── STEP 0: Nome do admin ── */}
        {step === 0 && (
          <StepWrapper stepKey="s0">
            <div style={{ fontSize: 36, marginBottom: 16, textAlign: "center" }}>👋</div>
            <div style={questionStyle}>Olá! Como posso te chamar?</div>
            <div style={subStyle}>Vamos configurar tudo em menos de 2 minutos.</div>
            <input
              ref={inputRef}
              value={adminName}
              onChange={e => setAdminName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && adminName.trim() && goNext()}
              placeholder="Seu nome"
              style={inputStyle}
            />
            <div style={{ height: 16 }} />
            <button onClick={goNext} disabled={!adminName.trim()} style={primaryBtn(!adminName.trim())}>
              Continuar →
            </button>
          </StepWrapper>
        )}

        {/* ── STEP 1: Gênero do atleta ── */}
        {step === 1 && (
          <StepWrapper stepKey="s1">
            <div style={{ fontSize: 36, marginBottom: 16, textAlign: "center" }}>🏅</div>
            <div style={questionStyle}>
              Olá, {adminName.split(" ")[0]}! Seu atleta é...
            </div>
            <div style={subStyle}>Isso nos ajuda a personalizar a experiência.</div>
            <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
              <GenderCard
                emoji="👧"
                label="Menina"
                selected={gender === "f"}
                onClick={() => setGender("f")}
              />
              <GenderCard
                emoji="👦"
                label="Menino"
                selected={gender === "m"}
                onClick={() => setGender("m")}
              />
            </div>
            <button onClick={goNext} disabled={!gender} style={primaryBtn(!gender)}>
              Continuar →
            </button>
          </StepWrapper>
        )}

        {/* ── STEP 2: Nome do atleta ── */}
        {step === 2 && (
          <StepWrapper stepKey="s2">
            <div style={{ fontSize: 36, marginBottom: 16, textAlign: "center" }}>
              {isFemale ? "🎀" : "🎽"}
            </div>
            <div style={questionStyle}>
              Qual é o nome {isFemale ? "da sua tenista?" : "do seu tenista?"}
            </div>
            <div style={subStyle}>
              {isFemale
                ? "Ela vai aparecer no placar e nas estatísticas."
                : "Ele vai aparecer no placar e nas estatísticas."}
            </div>
            <input
              ref={inputRef}
              value={athleteName}
              onChange={e => setAthleteName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && athleteName.trim() && goNext()}
              placeholder={isFemale ? "Nome da tenista" : "Nome do tenista"}
              style={inputStyle}
            />
            <div style={{ height: 16 }} />
            <button onClick={goNext} disabled={!athleteName.trim()} style={primaryBtn(!athleteName.trim())}>
              Continuar →
            </button>
          </StepWrapper>
        )}

        {/* ── STEP 3: Confirmação / "Login" placeholder ── */}
        {step === 3 && (
          <StepWrapper stepKey="s3">
            <div style={{ fontSize: 48, marginBottom: 16, textAlign: "center", animation: "bounceIn 0.5s ease" }}>🎾</div>
            <div style={questionStyle}>Tudo pronto, {adminName.split(" ")[0]}!</div>
            <div style={subStyle}>
              {athleteName} já tem {isFemale ? "um perfil criado" : "um perfil criado"}. Você pode iniciar a primeira partida agora.
            </div>

            {/* Summary card */}
            <div style={{
              background: "rgba(201,169,110,0.07)",
              border: "1px solid rgba(201,169,110,0.2)",
              borderRadius: 16,
              padding: "16px 20px",
              marginBottom: 24,
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "Admin", value: adminName },
                  { label: isFemale ? "Tenista" : "Tenista", value: athleteName },
                  { label: "Perfil", value: isFemale ? "Feminino" : "Masculino" },
                ].map(row => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: muted, letterSpacing: 0.5, textTransform: "uppercase" }}>{row.label}</span>
                    <span style={{ fontSize: 14, color: goldLight, fontWeight: 700 }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Login placeholder note */}
            <div style={{
              background: "rgba(124,111,158,0.1)",
              border: "1px solid rgba(124,111,158,0.2)",
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 20,
              fontSize: 12,
              color: "rgba(200,190,230,0.6)",
              textAlign: "center",
              lineHeight: 1.5,
            }}>
              🔐 Login com Google e e-mail chegando em breve
            </div>

            <button onClick={handleComplete} style={primaryBtn(false)}>
              🎾 Iniciar primeira partida
            </button>
          </StepWrapper>
        )}
      </div>

      {/* Step back */}
      {step > 0 && (
        <button onClick={() => setStep(s => s - 1)} style={{
          marginTop: 20,
          background: "transparent",
          border: "none",
          color: muted,
          fontSize: 13,
          cursor: "pointer",
          fontFamily: "Georgia, serif",
          letterSpacing: 0.3,
        }}>
          ← Voltar
        </button>
      )}
    </div>
  );
}
