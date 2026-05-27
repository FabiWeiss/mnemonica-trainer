import { useState, useEffect, useCallback, useRef } from "react";

// ─── DATA ────────────────────────────────────────────────────────────────────

const DEFAULT_CARD_IMAGES = {
  "♣A":"Kirchturm","♣2":"Betender Mensch","♣3":"Bibel","♣4":"Nikolaus",
  "♣5":"Weihrauch","♣6":"Notenschlüssel","♣7":"Weihwasser","♣8":"Kirchenfenster",
  "♣9":"Kirchenglocke","♣10":"Moses mit 10 Geboten","♣B":"Ministrant","♣D":"Maria","♣K":"Papst",
  "♥A":"Stethoskop","♥2":"Ohr","♥3":"Lunge","♥4":"Skalpell",
  "♥5":"Geburt","♥6":"Schwangere Frau","♥7":"Spritze","♥8":"Augen",
  "♥9":"Wunde","♥10":"OP-Tisch","♥B":"Baby","♥D":"Schwester","♥K":"Chirurg",
  "♠A":"Berg","♠2":"Schwan","♠3":"Kolibri","♠4":"Baum",
  "♠5":"Ast","♠6":"Schnecke","♠7":"Sense","♠8":"Eule",
  "♠9":"Sonnenblume","♠10":"Seerose","♠B":"Mogli","♠D":"Arielle","♠K":"Zentaur",
  "♦A":"Diamant","♦2":"Schimmel","♦3":"Krone","♦4":"Hellebarde",
  "♦5":"Siegelring","♦6":"Gucci Täschchen","♦7":"Florett","♦8":"Ballkleid",
  "♦9":"Venezianische Maske","♦10":"Zepter und Reichsapfel",
  "♦B":"Joffrey","♦D":"Kleopatra","♦K":"Donald Trump",
};

const MNEMONICA_STACK = [
  "♣4","♥2","♦7","♣3","♥4","♦6","♠A","♥5","♠9","♠2",
  "♥D","♦3","♣D","♥8","♠6","♠5","♥9","♣K","♦2","♥B",
  "♠3","♠8","♥6","♣10","♦5","♦K","♣2","♥3","♦8","♣5",
  "♠K","♦B","♣8","♠10","♥K","♣B","♠7","♥10","♦A","♠4",
  "♥7","♦4","♣A","♣9","♠B","♦D","♣7","♠D","♦10","♣6",
  "♥A","♦9"
];

const DEFAULT_MAJOR = {
  "00":"","01":"Tee","02":"Noah","03":"Miau","04":"Reh","05":"Lee",
  "06":"Schi","07":"Kuh","08":"Fee","09":"Po","10":"Tasse",
  "11":"Titte","12":"Tonne","13":"Tom","14":"Tor","15":"Tal",
  "16":"Tasche","17":"Theke","18":"Taufe","19":"Taube","20":"Nuss",
  "21":"Nutte","22":"Nonne","23":"Name","24":"Narr","25":"Nil",
  "26":"Nische","27":"Nokia","28":"Neffe","29":"Neubau","30":"Mass",
  "31":"Motte","32":"Mine","33":"Mama","34":"Mohr","35":"Mehl",
  "36":"Muschi","37":"Mekka","38":"Mofa","39":"Mappe","40":"Riese",
  "41":"Ratte","42":"Ruine","43":"Rum","44":"Rohr","45":"Rolle",
  "46":"Rauch","47":"Rock","48":"Riff","49":"Raupe","50":"Lasso",
  "51":"Latte","52":"Leine","53":"Lamm","54":"Leier","55":"Lolli",
  "56":"Loch","57":"Locke","58":"Lava","59":"Lupe","60":"Scheiße",
  "61":"Schutt","62":"Scheune","63":"Schaum","64":"Schere","65":"Schal",
  "66":"Schach","67":"Scheck","68":"Schaf","69":"Schabe","70":"Käse",
  "71":"Kette","72":"Kanne","73":"Kamm","74":"Karre","75":"Kehle",
  "76":"Koch","77":"Kakao","78":"Kaffee","79":"Kappe","80":"Fuß",
  "81":"Fett","82":"Fahne","83":"WM","84":"Feuer","85":"Falle",
  "86":"Fisch","87":"Fick","88":"Vivi","89":"Fabi","90":"Bus",
  "91":"Bett","92":"Bohne","93":"Baum","94":"Bier","95":"Ball",
  "96":"Buch","97":"Backe","98":"Bifi","99":"Baby"
};

const SUIT_LABELS = {"♣":"Kreuz","♥":"Herz","♠":"Pik","♦":"Karo"};
const SUIT_COLORS = {"♣":"#7ec8a0","♥":"#e86c6c","♠":"#aac4e8","♦":"#f5c842"};
const SUITS = ["♣","♥","♠","♦"];
const VAL_MAP = {A:"As",B:"Bube",D:"Dame",K:"König"};

function cardLabel(id) {
  const suit = id[0], val = id.slice(1);
  return `${SUIT_LABELS[suit]} ${VAL_MAP[val]||val}`;
}
function allCards() {
  return SUITS.flatMap(s => ["A","2","3","4","5","6","7","8","9","10","B","D","K"].map(v => s+v));
}
function posKey(pos) { return String(pos).padStart(2,"0"); }

// ─── STORAGE ─────────────────────────────────────────────────────────────────

function loadData(key, def) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; }
  catch { return def; }
}
function saveData(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ─── SPEECH ──────────────────────────────────────────────────────────────────

function speak(text, onEnd) {
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "de-DE"; u.rate = 0.92; u.pitch = 1;
  const voices = window.speechSynthesis.getVoices();
  const de = voices.find(v => v.lang.startsWith("de"));
  if (de) u.voice = de;
  if (onEnd) u.onend = onEnd;
  window.speechSynthesis.speak(u);
}

// ─── UI HELPERS ───────────────────────────────────────────────────────────────

function CardFace({ id, big }) {
  const suit = id[0], val = id.slice(1);
  const c = SUIT_COLORS[suit];
  return (
    <div style={{
      display:"inline-flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      width:big?130:68,height:big?182:95,
      background:`${c}14`,border:`2px solid ${c}`,borderRadius:big?16:10,
      fontFamily:"'Playfair Display',serif",color:c,
      boxShadow:`0 0 ${big?24:8}px ${c}44`,userSelect:"none",flexShrink:0,
    }}>
      <span style={{fontSize:big?22:13,fontWeight:700}}>{VAL_MAP[val]||val}</span>
      <span style={{fontSize:big?44:24,lineHeight:1.1}}>{suit}</span>
    </div>
  );
}

function BackBtn({onClick}) {
  return (
    <button onClick={onClick} style={{
      background:"transparent",border:"1px solid #444",borderRadius:8,
      padding:"6px 14px",cursor:"pointer",color:"#888",fontSize:13,
      marginBottom:20,display:"inline-flex",alignItems:"center",gap:6,
    }}>← Zurück</button>
  );
}

function VoiceToggle({ voiceMode, setVoiceMode }) {
  return (
    <div style={{
      display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,
      background:voiceMode?"rgba(245,200,66,0.10)":"rgba(255,255,255,0.03)",
      border:`1.5px solid ${voiceMode?"#f5c842":"#333"}`,borderRadius:10,padding:"10px 14px",
    }}>
      <div>
        <div style={{color:voiceMode?"#f5c842":"#aaa",fontSize:13,fontWeight:600}}>🎙️ Sprach-Dialog-Modus</div>
        <div style={{color:"#555",fontSize:10,marginTop:2}}>„Tipp" · „Weiter" · „Stop"</div>
      </div>
      <div onClick={()=>setVoiceMode(!voiceMode)} style={{
        width:44,height:24,borderRadius:12,background:voiceMode?"#f5c842":"#333",
        cursor:"pointer",position:"relative",transition:"background 0.2s",flexShrink:0,marginLeft:12,
      }}>
        <div style={{position:"absolute",top:3,left:voiceMode?22:3,width:18,height:18,
          borderRadius:"50%",background:voiceMode?"#0d1117":"#888",transition:"left 0.2s"}}/>
      </div>
    </div>
  );
}

const baseInput = {
  background:"rgba(255,255,255,0.06)",border:"1px solid #444",borderRadius:8,
  padding:"6px 12px",color:"#e8dcc8",fontSize:14,outline:"none",
  fontFamily:"'Crimson Text',serif",
};

function aBtn(color) {
  return {
    background:`${color}22`,border:`1.5px solid ${color}`,borderRadius:10,
    padding:"10px 20px",cursor:"pointer",color,fontSize:15,
    fontFamily:"'Crimson Text',serif",transition:"all 0.2s",flex:1,
  };
}

// ─── CONTEXT BOX (shown after reveal) ────────────────────────────────────────

function ContextBox({ cardId, position, majorSystem, cardImages, highlight }) {
  // highlight: which field is the "answer" (already shown large) — dim it slightly
  const pos = position !== undefined ? position : (cardId ? MNEMONICA_STACK.indexOf(cardId)+1 : null);
  const posStr = pos && pos > 0 ? posKey(pos) : null;
  const majorImg = posStr ? (majorSystem[posStr]||"—") : "—";
  const cardImg = cardId ? (cardImages[cardId]||"—") : "—";
  const cardName = cardId ? cardLabel(cardId) : "—";

  const Cell = ({label, value, dim, isCard}) => (
    <div style={{
      flex:1, textAlign:"center", padding:"8px 6px",
      opacity: dim ? 0.45 : 1,
      borderRight:"1px solid #2a2a2a",
    }}>
      <div style={{color:"#555",fontSize:10,letterSpacing:1,textTransform:"uppercase",marginBottom:5}}>{label}</div>
      {isCard && cardId
        ? <CardFace id={cardId}/>
        : <div style={{color:"#e8dcc8",fontSize:14,fontWeight:dim?400:600}}>{value}</div>
      }
    </div>
  );

  return (
    <div style={{
      display:"flex", marginTop:14,
      background:"rgba(255,255,255,0.03)", border:"1px solid #2a2a2a",
      borderRadius:12, overflow:"hidden",
    }}>
      <Cell label="Position" value={pos||"—"} dim={highlight==="pos"}/>
      <Cell label="Major-Bild" value={majorImg} dim={highlight==="major"}/>
      <Cell label="Karte" value={cardName} isCard dim={highlight==="card"}/>
      <div style={{flex:1,textAlign:"center",padding:"8px 6px",opacity:highlight==="cardimg"?0.45:1}}>
        <div style={{color:"#555",fontSize:10,letterSpacing:1,textTransform:"uppercase",marginBottom:5}}>Kartenbild</div>
        <div style={{color:"#e8dcc8",fontSize:14,fontWeight:highlight==="cardimg"?400:600}}>{cardImg}</div>
      </div>
    </div>
  );
}

// ─── REFERENCE TABLE MODAL ────────────────────────────────────────────────────

function RefTableModal({ onClose, majorSystem, cardImages }) {
  const [filterSuit, setFilterSuit] = useState("all");

  const rows = MNEMONICA_STACK.map((cardId, i) => {
    const pos = i+1;
    const posStr = posKey(pos);
    return {
      pos, posStr,
      major: majorSystem[posStr]||"—",
      cardId,
      cardName: cardLabel(cardId),
      cardImg: cardImages[cardId]||"—",
      suit: cardId[0],
    };
  }).filter(r => filterSuit==="all" || r.suit===filterSuit);

  return (
    <div style={{
      position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:1000,
      display:"flex",alignItems:"flex-start",justifyContent:"center",
      overflowY:"auto",padding:"20px 10px",
    }} onClick={onClose}>
      <div style={{
        background:"#141820",border:"1px solid #2a2a2a",borderRadius:16,
        width:"100%",maxWidth:680,padding:"20px",
      }} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <h2 style={{fontFamily:"'Playfair Display',serif",color:"#f5c842",fontSize:20,margin:0}}>
            Referenztabelle
          </h2>
          <button onClick={onClose} style={{background:"transparent",border:"1px solid #444",
            borderRadius:8,padding:"4px 12px",cursor:"pointer",color:"#888",fontSize:14}}>✕</button>
        </div>

        {/* Filter */}
        <div style={{display:"flex",gap:7,marginBottom:14,flexWrap:"wrap"}}>
          {[["all","Alle"],...SUITS.map(s=>[s,`${s} ${SUIT_LABELS[s]}`])].map(([v,l])=>(
            <button key={v} onClick={()=>setFilterSuit(v)} style={{
              background:filterSuit===v?`${v==="all"?"#f5c842":SUIT_COLORS[v]}22`:"transparent",
              border:`1.5px solid ${filterSuit===v?(v==="all"?"#f5c842":SUIT_COLORS[v]):"#444"}`,
              borderRadius:7,padding:"3px 11px",cursor:"pointer",
              color:v==="all"?"#f5c842":(SUIT_COLORS[v]||"#e8dcc8"),fontSize:13,
            }}>{l}</button>
          ))}
        </div>

        {/* Table header */}
        <div style={{display:"grid",gridTemplateColumns:"44px 1fr 80px 1fr 1fr",
          gap:8,padding:"6px 8px",marginBottom:4}}>
          {["Pos","Major-Bild","Karte","Kartenname","Kartenbild"].map(h=>(
            <div key={h} style={{color:"#555",fontSize:10,letterSpacing:1,textTransform:"uppercase"}}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        <div style={{display:"flex",flexDirection:"column",gap:3,maxHeight:"65vh",overflowY:"auto"}}>
          {rows.map(r=>(
            <div key={r.pos} style={{
              display:"grid",gridTemplateColumns:"44px 1fr 80px 1fr 1fr",
              gap:8,padding:"7px 8px",
              background:"rgba(255,255,255,0.025)",borderRadius:8,alignItems:"center",
            }}>
              <div style={{fontWeight:700,color:"#f5c842",fontFamily:"'Playfair Display',serif",fontSize:15}}>{r.pos}</div>
              <div style={{color:"#aac4e8",fontSize:13}}>{r.major}</div>
              <CardFace id={r.cardId}/>
              <div style={{color:SUIT_COLORS[r.suit],fontSize:13}}>{r.cardName}</div>
              <div style={{color:"#7ec8a0",fontSize:13}}>{r.cardImg}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RefButton({ onClick }) {
  return (
    <button onClick={onClick} style={{
      background:"rgba(245,200,66,0.08)",border:"1px solid #f5c84244",
      borderRadius:8,padding:"6px 14px",cursor:"pointer",
      color:"#f5c842",fontSize:13,display:"flex",alignItems:"center",gap:6,
      marginLeft:"auto",
    }}>📋 Tabelle</button>
  );
}

// ─── VOICE ENGINE HOOK ───────────────────────────────────────────────────────

function useVoiceEngine({ voiceMode, getQuestion, getAnswer, onCorrect, onWrong, onNext, onStop }) {
  const [isListening, setIsListening] = useState(false);
  const [micText, setMicText] = useState("");
  const [voiceFeedback, setVoiceFeedback] = useState("");
  const activeRef = useRef(false);
  const recRef = useRef(null);

  const stopEngine = useCallback(() => {
    activeRef.current = false;
    recRef.current?.stop();
    window.speechSynthesis?.cancel();
    setIsListening(false); setVoiceFeedback(""); setMicText("");
  }, []);

  const listenOnce = useCallback(() => {
    if (!activeRef.current) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setVoiceFeedback("⚠️ Spracherkennung nicht verfügbar"); return; }
    const r = new SR();
    recRef.current = r;
    r.lang="de-DE"; r.continuous=false; r.interimResults=false;
    r.onstart=()=>setIsListening(true);
    r.onend=()=>setIsListening(false);
    r.onerror=(e)=>{ setIsListening(false); if(e.error==="no-speech"&&activeRef.current) setTimeout(listenOnce,500); };
    r.onresult=(e)=>{
      const t=e.results[0][0].transcript.trim().toLowerCase();
      setMicText(t); setIsListening(false); processAnswer(t);
    };
    r.start();
  }, []);

  const processAnswer = useCallback((t) => {
    if (!activeRef.current) return;
    if (t.includes("stop")||t.includes("beenden")) {
      activeRef.current=false; speak("Bis zum nächsten Mal!"); setVoiceFeedback("🛑 Beendet"); onStop(); return;
    }
    if (t.includes("tipp")||t.includes("hilfe")) {
      const ans=getAnswer(); const hint=ans.slice(0,Math.ceil(ans.length/2))+"…";
      setVoiceFeedback(`💡 Tipp: ${hint}`);
      speak(`Tipp: ${hint}`,()=>{ if(activeRef.current) setTimeout(listenOnce,300); }); return;
    }
    if (t.includes("weiter")||t.includes("nächste")||t.includes("überspringen")) { onNext(); return; }
    const ans=getAnswer().toLowerCase();
    const words=ans.split(/[\s\-\/,]+/).filter(w=>w.length>2);
    const correct=t.includes(ans)||words.some(w=>t.includes(w));
    if (correct) {
      setVoiceFeedback("✅ Richtig!"); speak("Richtig!",()=>{ if(activeRef.current) onCorrect(); });
    } else {
      setVoiceFeedback(`❌ Falsch — ${getAnswer()}`);
      speak(`Falsch. Die Antwort ist: ${getAnswer()}`,()=>{ if(activeRef.current) onWrong(); });
    }
  }, [getAnswer, listenOnce, onCorrect, onWrong, onNext, onStop]);

  const startRound = useCallback((questionText) => {
    if (!voiceMode) return;
    activeRef.current=true; setVoiceFeedback(""); setMicText("");
    speak(questionText,()=>{ if(activeRef.current) setTimeout(listenOnce,300); });
  }, [voiceMode, listenOnce]);

  return { isListening, micText, voiceFeedback, startRound, stopEngine };
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const [cardImages, setCardImages] = useState(()=>loadData("cardImages_v3",DEFAULT_CARD_IMAGES));
  const [majorSystem, setMajorSystem] = useState(()=>loadData("majorSystem_v3",DEFAULT_MAJOR));
  const [stats, setStats] = useState(()=>loadData("stats_v3",{}));
  const [screen, setScreen] = useState("home");
  const [showRef, setShowRef] = useState(false);

  const updateCardImages=(v)=>{ setCardImages(v); saveData("cardImages_v3",v); };
  const updateMajorSystem=(v)=>{ setMajorSystem(v); saveData("majorSystem_v3",v); };
  const updateStats=(v)=>{ setStats(v); saveData("stats_v3",v); };

  return (
    <div style={{minHeight:"100vh",background:"#0d1117",fontFamily:"'Crimson Text','Georgia',serif",color:"#e8dcc8"}}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet"/>
      {showRef && <RefTableModal onClose={()=>setShowRef(false)} majorSystem={majorSystem} cardImages={cardImages}/>}
      {screen==="home"      && <HomeScreen setScreen={setScreen} stats={stats}/>}
      {screen==="train"     && <TrainScreen cardImages={cardImages} majorSystem={majorSystem} stats={stats} updateStats={updateStats} setScreen={setScreen} setShowRef={setShowRef}/>}
      {screen==="major"     && <MajorScreen majorSystem={majorSystem} cardImages={cardImages} stats={stats} updateStats={updateStats} setScreen={setScreen} setShowRef={setShowRef}/>}
      {screen==="edit"      && <EditScreen cardImages={cardImages} updateCardImages={updateCardImages} setScreen={setScreen}/>}
      {screen==="editMajor" && <EditMajorScreen majorSystem={majorSystem} updateMajorSystem={updateMajorSystem} setScreen={setScreen}/>}
      {screen==="stats"     && <StatsScreen stats={stats} updateStats={updateStats} setScreen={setScreen}/>}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────

function HomeScreen({ setScreen, stats }) {
  const practiced = Object.keys(stats).length;
  const NavBtn = ({ icon, label, sub, sc, color }) => (
    <button onClick={()=>setScreen(sc)} style={{
      background:`${color}0d`,border:`1.5px solid ${color}33`,borderRadius:14,
      padding:"15px 18px",cursor:"pointer",display:"flex",alignItems:"center",gap:14,
      color:"#e8dcc8",width:"100%",transition:"all 0.2s",textAlign:"left",
    }}
    onMouseEnter={e=>{e.currentTarget.style.borderColor=color;e.currentTarget.style.background=`${color}18`;}}
    onMouseLeave={e=>{e.currentTarget.style.borderColor=`${color}33`;e.currentTarget.style.background=`${color}0d`;}}>
      <span style={{fontSize:24}}>{icon}</span>
      <div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,color}}>{label}</div>
        {sub && <div style={{color:"#666",fontSize:11,marginTop:2}}>{sub}</div>}
      </div>
    </button>
  );
  return (
    <div style={{maxWidth:480,margin:"0 auto",padding:"44px 20px"}}>
      <div style={{textAlign:"center",marginBottom:40}}>
        <div style={{fontSize:46,marginBottom:6}}>🃏</div>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:32,fontWeight:900,color:"#f5c842",margin:0}}>Mnemonica</h1>
        <p style={{color:"#555",fontSize:13,margin:"6px 0 0"}}>Kartengedächtnis-Trainer · Tamariz Stack</p>
        {practiced>0 && <p style={{color:"#7ec8a044",fontSize:11,marginTop:6}}>⚡ {practiced} Einträge in der Statistik</p>}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:9}}>
        <div style={{color:"#444",fontSize:10,letterSpacing:2,textTransform:"uppercase",marginBottom:3}}>Training</div>
        <NavBtn icon="🃏" label="Kartentraining" sub="Karte↔Bild · Position↔Karte (Stack)" sc="train" color="#7ec8a0"/>
        <NavBtn icon="🔢" label="Major System" sub="Zahl↔Bild (00–99)" sc="major" color="#f5c842"/>
        <div style={{color:"#444",fontSize:10,letterSpacing:2,textTransform:"uppercase",marginTop:8,marginBottom:3}}>Verwaltung</div>
        <NavBtn icon="✏️" label="Kartenbilder bearbeiten" sub="Assoziationen anpassen" sc="edit" color="#aac4e8"/>
        <NavBtn icon="📝" label="Major System bearbeiten" sub="Zahlenbilder anpassen" sc="editMajor" color="#f5c842"/>
        <NavBtn icon="📊" label="Statistik" sub="Trefferquoten & Fortschritt" sc="stats" color="#e86c6c"/>
      </div>
    </div>
  );
}

// ─── TRAIN SCREEN ─────────────────────────────────────────────────────────────

const TRAIN_MODES = [
  {id:"card2img",label:"Karte → Bild",stack:false},
  {id:"img2card",label:"Bild → Karte",stack:false},
  {id:"pos2card",label:"Position → Karte (Stack)",stack:true},
  {id:"card2pos",label:"Karte → Position (Stack)",stack:true},
];

function TrainScreen({ cardImages, majorSystem, stats, updateStats, setScreen, setShowRef }) {
  const [mode, setMode] = useState(null);
  const [filterSuits, setFilterSuits] = useState(new Set(SUITS));
  const [filterTypes, setFilterTypes] = useState(new Set(["num","face"]));
  const [stackRange, setStackRange] = useState([1,52]);
  const [voiceMode, setVoiceMode] = useState(false);
  const [card, setCard] = useState(null);
  const [revealed, setRevealed] = useState(false);

  const getPool = useCallback(()=>{
    if (mode==="pos2card"||mode==="card2pos")
      return MNEMONICA_STACK.slice(stackRange[0]-1,stackRange[1]);
    return allCards().filter(id=>{
      const suit=id[0],val=id.slice(1);
      if(!filterSuits.has(suit)) return false;
      const isFace=["B","D","K","A"].includes(val);
      return isFace?filterTypes.has("face"):filterTypes.has("num");
    });
  },[mode,filterSuits,filterTypes,stackRange]);

  const pickCard = useCallback(()=>{
    const p=getPool(); if(!p.length) return null;
    return p[Math.floor(Math.random()*p.length)];
  },[getPool]);

  const getAnswerFor = useCallback((c)=>{
    if(!c) return "";
    if(mode==="card2img") return cardImages[c]||"?";
    if(mode==="img2card") return cardLabel(c);
    if(mode==="pos2card") return cardLabel(c);
    if(mode==="card2pos") return `Position ${MNEMONICA_STACK.indexOf(c)+1}`;
    return "";
  },[mode,cardImages]);

  const getQuestionFor = useCallback((c)=>{
    if(!c) return "";
    if(mode==="card2img") return cardLabel(c);
    if(mode==="img2card") return cardImages[c]||"?";
    if(mode==="pos2card") return `Position ${MNEMONICA_STACK.indexOf(c)+1}`;
    if(mode==="card2pos") return cardLabel(c);
    return "";
  },[mode,cardImages]);

  const recordStat = useCallback((c,correct)=>{
    if(!c||!mode) return;
    const key=mode+":"+c, prev=stats[key]||{correct:0,wrong:0};
    updateStats({...stats,[key]:{correct:prev.correct+(correct?1:0),wrong:prev.wrong+(correct?0:1)}});
  },[mode,stats,updateStats]);

  const cardRef = useRef(card);
  useEffect(()=>{cardRef.current=card;},[card]);

  const {isListening,micText,voiceFeedback,startRound,stopEngine} = useVoiceEngine({
    voiceMode,
    getQuestion:()=>getQuestionFor(cardRef.current),
    getAnswer:()=>getAnswerFor(cardRef.current),
    onCorrect:()=>{ recordStat(cardRef.current,true); const n=pickCard(); setCard(n); setRevealed(false); setTimeout(()=>startRound(getQuestionFor(n)),400); },
    onWrong:()=>{ recordStat(cardRef.current,false); const n=pickCard(); setCard(n); setRevealed(false); setTimeout(()=>startRound(getQuestionFor(n)),400); },
    onNext:()=>{ const n=pickCard(); setCard(n); setRevealed(false); setTimeout(()=>startRound(getQuestionFor(n)),200); },
    onStop:()=>setVoiceMode(false),
  });

  const startMode=(m)=>{ setMode(m); const c=pickCard(); setCard(c); setRevealed(false); if(voiceMode) setTimeout(()=>startRound(getQuestionFor(c)),500); };
  useEffect(()=>()=>stopEngine(),[]);

  const toggle=(set,setFn,val)=>{ const n=new Set(set); n.has(val)?n.delete(val):n.add(val); setFn(n); };
  const modeInfo = TRAIN_MODES.find(m=>m.id===mode);
  const pos = card ? MNEMONICA_STACK.indexOf(card)+1 : 0;

  // context highlight: which field is the "answer" being shown large
  const ctxHighlight = mode==="card2img"?"cardimg":mode==="img2card"?"card":mode==="pos2card"?"card":mode==="card2pos"?"pos":null;

  if (!mode) return (
    <div style={{maxWidth:480,margin:"0 auto",padding:"28px 20px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
        <BackBtn onClick={()=>setScreen("home")}/>
        <RefButton onClick={()=>setShowRef(true)}/>
      </div>
      <h2 style={{fontFamily:"'Playfair Display',serif",color:"#7ec8a0",fontSize:22,marginBottom:16}}>Kartentraining</h2>
      <div style={{display:"flex",flexDirection:"column",gap:9,marginBottom:4}}>
        {TRAIN_MODES.map(m=>(
          <button key={m.id} onClick={()=>startMode(m.id)} style={{
            background:"rgba(126,200,160,0.07)",border:"1.5px solid #7ec8a022",
            borderRadius:12,padding:"13px 17px",cursor:"pointer",textAlign:"left",color:"#e8dcc8",transition:"all 0.18s",
          }}
          onMouseEnter={e=>e.currentTarget.style.borderColor="#7ec8a0"}
          onMouseLeave={e=>e.currentTarget.style.borderColor="#7ec8a022"}>
            <span style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:"#7ec8a0"}}>{m.label}</span>
          </button>
        ))}
      </div>
      <div style={{marginTop:16,background:"rgba(255,255,255,0.03)",border:"1px solid #2a2a2a",borderRadius:13,padding:"15px 16px"}}>
        <div style={{color:"#555",fontSize:10,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>Filter & Optionen</div>
        <VoiceToggle voiceMode={voiceMode} setVoiceMode={setVoiceMode}/>
        <div style={{marginBottom:10}}>
          <div style={{color:"#666",fontSize:11,marginBottom:7}}>Farben:</div>
          <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
            {SUITS.map(s=>(
              <button key={s} onClick={()=>toggle(filterSuits,setFilterSuits,s)} style={{
                background:filterSuits.has(s)?`${SUIT_COLORS[s]}2a`:"transparent",
                border:`1.5px solid ${filterSuits.has(s)?SUIT_COLORS[s]:"#444"}`,
                borderRadius:8,padding:"3px 10px",cursor:"pointer",color:SUIT_COLORS[s],fontSize:13,
              }}>{s} {SUIT_LABELS[s]}</button>
            ))}
          </div>
        </div>
        <div style={{marginBottom:10}}>
          <div style={{color:"#666",fontSize:11,marginBottom:7}}>Kartentyp:</div>
          <div style={{display:"flex",gap:7}}>
            {[["num","Zahlen"],["face","Bildkarten"]].map(([t,l])=>(
              <button key={t} onClick={()=>toggle(filterTypes,setFilterTypes,t)} style={{
                background:filterTypes.has(t)?"rgba(126,200,160,0.18)":"transparent",
                border:`1.5px solid ${filterTypes.has(t)?"#7ec8a0":"#444"}`,
                borderRadius:8,padding:"3px 11px",cursor:"pointer",color:"#e8dcc8",fontSize:12,
              }}>{l}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={{color:"#666",fontSize:11,marginBottom:7}}>Stack-Bereich:</div>
          <div style={{display:"flex",gap:9,alignItems:"center"}}>
            <input type="number" min={1} max={52} value={stackRange[0]} onChange={e=>setStackRange([Math.max(1,parseInt(e.target.value)||1),stackRange[1]])} style={{...baseInput,width:56}}/>
            <span style={{color:"#444"}}>–</span>
            <input type="number" min={1} max={52} value={stackRange[1]} onChange={e=>setStackRange([stackRange[0],Math.min(52,parseInt(e.target.value)||52)])} style={{...baseInput,width:56}}/>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{maxWidth:480,margin:"0 auto",padding:"24px 20px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <BackBtn onClick={()=>{stopEngine();setMode(null);}}/>
        <span style={{fontFamily:"'Playfair Display',serif",color:"#7ec8a0",fontSize:15}}>{modeInfo?.label}</span>
        {voiceMode && (
          <div style={{display:"flex",alignItems:"center",gap:7,marginLeft:8}}>
            {isListening && <span style={{color:"#f5c842",fontSize:11,animation:"pulse 1.2s infinite"}}>● Höre zu…</span>}
            <button onClick={()=>{stopEngine();setVoiceMode(false);}} style={{background:"#e86c6c1a",border:"1px solid #e86c6c",borderRadius:7,padding:"3px 9px",cursor:"pointer",color:"#e86c6c",fontSize:11}}>Stop</button>
          </div>
        )}
        <RefButton onClick={()=>setShowRef(true)}/>
      </div>

      <div style={{background:"rgba(255,255,255,0.025)",border:"1px solid #222",borderRadius:16,
        padding:"28px 20px",textAlign:"center",minHeight:200,
        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12}}>
        {card && <>
          {(mode==="card2img"||mode==="card2pos") && <CardFace id={card} big/>}
          {mode==="img2card" && <div style={{fontSize:24,color:"#f5c842",fontFamily:"'Playfair Display',serif"}}>„{cardImages[card]||"?"}"</div>}
          {mode==="pos2card" && <div style={{fontSize:64,color:"#f5c842",fontFamily:"'Playfair Display',serif",fontWeight:900}}>#{pos}</div>}
        </>}
        {revealed && !voiceMode && (
          <div style={{width:"100%",padding:"12px 16px",background:"rgba(126,200,160,0.08)",borderRadius:10,border:"1px solid #7ec8a022"}}>
            {(mode==="pos2card"||mode==="img2card") && card && <CardFace id={card} big/>}
            {mode==="card2img" && <div style={{fontSize:20,color:"#7ec8a0"}}>{cardImages[card]||"—"}</div>}
            {mode==="card2pos" && <div style={{fontSize:52,color:"#f5c842",fontWeight:900,fontFamily:"'Playfair Display',serif"}}>#{pos}</div>}
          </div>
        )}
        {/* Context box after reveal */}
        {revealed && card && (
          <div style={{width:"100%"}}>
            <ContextBox cardId={card} majorSystem={majorSystem} cardImages={cardImages} highlight={ctxHighlight}/>
          </div>
        )}
        {voiceFeedback && <div style={{fontSize:16,color:voiceFeedback.includes("✅")?"#7ec8a0":voiceFeedback.includes("❌")?"#e86c6c":"#f5c842"}}>{voiceFeedback}</div>}
        {micText && <div style={{color:"#aac4e8",fontSize:13,fontStyle:"italic"}}>🎤 „{micText}"</div>}
        {isListening && <div style={{color:"#f5c84266",fontSize:11}}>🎙️ Sprich jetzt… · „Tipp" · „Weiter" · „Stop"</div>}
      </div>

      {!voiceMode && (
        <div style={{display:"flex",gap:9,marginTop:12,flexWrap:"wrap"}}>
          {!revealed ? (
            <>
              <button onClick={()=>setRevealed(true)} style={aBtn("#f5c842")}>Aufdecken</button>
              <button onClick={()=>{const c=pickCard();setCard(c);setRevealed(false);}} style={aBtn("#555")}>Überspringen</button>
            </>
          ) : (
            <>
              <button onClick={()=>{recordStat(card,true);const c=pickCard();setCard(c);setRevealed(false);}} style={aBtn("#7ec8a0")}>✓ Richtig</button>
              <button onClick={()=>{recordStat(card,false);const c=pickCard();setCard(c);setRevealed(false);}} style={aBtn("#e86c6c")}>✗ Falsch</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MAJOR SCREEN ─────────────────────────────────────────────────────────────

function MajorScreen({ majorSystem, cardImages, stats, updateStats, setScreen, setShowRef }) {
  const [mode, setMode] = useState(null);
  const [rangeFrom, setRangeFrom] = useState(1);
  const [rangeTo, setRangeTo] = useState(99);
  const [voiceMode, setVoiceMode] = useState(false);
  const [current, setCurrent] = useState(null);
  const [revealed, setRevealed] = useState(false);

  const pool = useCallback(()=>
    Array.from({length:100},(_,i)=>String(i).padStart(2,"0"))
      .filter(n=>{const ni=parseInt(n);return ni>=rangeFrom&&ni<=rangeTo&&majorSystem[n];}),
  [rangeFrom,rangeTo,majorSystem]);

  const pickNum = useCallback(()=>{ const p=pool(); if(!p.length) return null; return p[Math.floor(Math.random()*p.length)]; },[pool]);

  const getAnswerFor = useCallback((n)=>{
    if(!n||!mode) return "";
    return mode==="num2img"?(majorSystem[n]||"?"):`${parseInt(n)}`;
  },[mode,majorSystem]);

  const getQuestionFor = useCallback((n)=>{
    if(!n||!mode) return "";
    return mode==="num2img"?`Bild für ${parseInt(n)}`:`Zahl für: ${majorSystem[n]||"?"}`;
  },[mode,majorSystem]);

  const recordStat = useCallback((n,correct)=>{
    if(!n||!mode) return;
    const key="major_"+mode+":"+n, prev=stats[key]||{correct:0,wrong:0};
    updateStats({...stats,[key]:{correct:prev.correct+(correct?1:0),wrong:prev.wrong+(correct?0:1)}});
  },[mode,stats,updateStats]);

  const curRef = useRef(current);
  useEffect(()=>{curRef.current=current;},[current]);

  const {isListening,micText,voiceFeedback,startRound,stopEngine} = useVoiceEngine({
    voiceMode,
    getQuestion:()=>getQuestionFor(curRef.current),
    getAnswer:()=>getAnswerFor(curRef.current),
    onCorrect:()=>{ recordStat(curRef.current,true); const n=pickNum(); setCurrent(n); setRevealed(false); setTimeout(()=>startRound(getQuestionFor(n)),400); },
    onWrong:()=>{ recordStat(curRef.current,false); const n=pickNum(); setCurrent(n); setRevealed(false); setTimeout(()=>startRound(getQuestionFor(n)),400); },
    onNext:()=>{ const n=pickNum(); setCurrent(n); setRevealed(false); setTimeout(()=>startRound(getQuestionFor(n)),200); },
    onStop:()=>setVoiceMode(false),
  });

  const startMode=(m)=>{ setMode(m); const n=pickNum(); setCurrent(n); setRevealed(false); if(voiceMode) setTimeout(()=>startRound(getQuestionFor(n)),500); };
  useEffect(()=>()=>stopEngine(),[]);

  // For context box: get card at this position
  const cardAtPos = current ? MNEMONICA_STACK[parseInt(current)-1] : null;
  const ctxHighlight = mode==="num2img"?"major":"major"; // always show major as the answer

  const modeInfo = [{id:"num2img",label:"Zahl → Bild"},{id:"img2num",label:"Bild → Zahl"}].find(m=>m.id===mode);

  if (!mode) return (
    <div style={{maxWidth:480,margin:"0 auto",padding:"28px 20px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <BackBtn onClick={()=>setScreen("home")}/>
        <RefButton onClick={()=>setShowRef(true)}/>
      </div>
      <h2 style={{fontFamily:"'Playfair Display',serif",color:"#f5c842",fontSize:22,marginBottom:16}}>Major System</h2>
      <div style={{display:"flex",flexDirection:"column",gap:9,marginBottom:4}}>
        {[{id:"num2img",label:"Zahl → Bild"},{id:"img2num",label:"Bild → Zahl"}].map(m=>(
          <button key={m.id} onClick={()=>startMode(m.id)} style={{
            background:"rgba(245,200,66,0.07)",border:"1.5px solid #f5c84222",
            borderRadius:12,padding:"13px 17px",cursor:"pointer",textAlign:"left",color:"#e8dcc8",transition:"all 0.18s",
          }}
          onMouseEnter={e=>e.currentTarget.style.borderColor="#f5c842"}
          onMouseLeave={e=>e.currentTarget.style.borderColor="#f5c84222"}>
            <span style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:"#f5c842"}}>{m.label}</span>
          </button>
        ))}
      </div>
      <div style={{marginTop:16,background:"rgba(255,255,255,0.03)",border:"1px solid #2a2a2a",borderRadius:13,padding:"15px 16px"}}>
        <div style={{color:"#555",fontSize:10,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>Optionen</div>
        <VoiceToggle voiceMode={voiceMode} setVoiceMode={setVoiceMode}/>
        <div style={{color:"#666",fontSize:11,marginBottom:7}}>Zahlenbereich:</div>
        <div style={{display:"flex",gap:9,alignItems:"center"}}>
          <input type="number" min={0} max={99} value={rangeFrom} onChange={e=>setRangeFrom(Math.max(0,parseInt(e.target.value)||0))} style={{...baseInput,width:56}}/>
          <span style={{color:"#444"}}>–</span>
          <input type="number" min={0} max={99} value={rangeTo} onChange={e=>setRangeTo(Math.min(99,parseInt(e.target.value)||99))} style={{...baseInput,width:56}}/>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{maxWidth:480,margin:"0 auto",padding:"24px 20px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <BackBtn onClick={()=>{stopEngine();setMode(null);}}/>
        <span style={{fontFamily:"'Playfair Display',serif",color:"#f5c842",fontSize:15}}>{modeInfo?.label}</span>
        {voiceMode && (
          <div style={{display:"flex",alignItems:"center",gap:7,marginLeft:8}}>
            {isListening && <span style={{color:"#f5c842",fontSize:11,animation:"pulse 1.2s infinite"}}>● Höre zu…</span>}
            <button onClick={()=>{stopEngine();setVoiceMode(false);}} style={{background:"#e86c6c1a",border:"1px solid #e86c6c",borderRadius:7,padding:"3px 9px",cursor:"pointer",color:"#e86c6c",fontSize:11}}>Stop</button>
          </div>
        )}
        <RefButton onClick={()=>setShowRef(true)}/>
      </div>

      <div style={{background:"rgba(255,255,255,0.025)",border:"1px solid #222",borderRadius:16,
        padding:"28px 20px",textAlign:"center",minHeight:200,
        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12}}>
        {current && <>
          {mode==="num2img" && <div style={{fontSize:68,color:"#f5c842",fontFamily:"'Playfair Display',serif",fontWeight:900}}>{parseInt(current)}</div>}
          {mode==="img2num" && <div style={{fontSize:28,color:"#f5c842",fontFamily:"'Playfair Display',serif"}}>„{majorSystem[current]}"</div>}
        </>}
        {revealed && !voiceMode && (
          <div style={{padding:"12px 20px",background:"rgba(245,200,66,0.09)",borderRadius:10,border:"1px solid #f5c84222"}}>
            {mode==="num2img" && <div style={{fontSize:22,color:"#7ec8a0"}}>{majorSystem[current]||"—"}</div>}
            {mode==="img2num" && <div style={{fontSize:52,color:"#f5c842",fontWeight:900,fontFamily:"'Playfair Display',serif"}}>{parseInt(current)}</div>}
          </div>
        )}
        {/* Context box after reveal — show card at this position */}
        {revealed && current && (
          <div style={{width:"100%"}}>
            <ContextBox
              cardId={cardAtPos||null}
              position={parseInt(current)}
              majorSystem={majorSystem}
              cardImages={cardImages}
              highlight={mode==="num2img"?"major":"major"}
            />
          </div>
        )}
        {voiceFeedback && <div style={{fontSize:16,color:voiceFeedback.includes("✅")?"#7ec8a0":voiceFeedback.includes("❌")?"#e86c6c":"#f5c842"}}>{voiceFeedback}</div>}
        {micText && <div style={{color:"#aac4e8",fontSize:13,fontStyle:"italic"}}>🎤 „{micText}"</div>}
        {isListening && <div style={{color:"#f5c84266",fontSize:11}}>🎙️ Sprich jetzt…</div>}
      </div>

      {!voiceMode && (
        <div style={{display:"flex",gap:9,marginTop:12,flexWrap:"wrap"}}>
          {!revealed ? (
            <>
              <button onClick={()=>setRevealed(true)} style={aBtn("#f5c842")}>Aufdecken</button>
              <button onClick={()=>{const n=pickNum();setCurrent(n);setRevealed(false);}} style={aBtn("#555")}>Überspringen</button>
            </>
          ) : (
            <>
              <button onClick={()=>{recordStat(current,true);const n=pickNum();setCurrent(n);setRevealed(false);}} style={aBtn("#7ec8a0")}>✓ Richtig</button>
              <button onClick={()=>{recordStat(current,false);const n=pickNum();setCurrent(n);setRevealed(false);}} style={aBtn("#e86c6c")}>✗ Falsch</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── EDIT SCREENS ─────────────────────────────────────────────────────────────

function EditScreen({ cardImages, updateCardImages, setScreen }) {
  const [filter, setFilter] = useState("all");
  const [local, setLocal] = useState({...cardImages});
  const [saved, setSaved] = useState(false);
  const cards = filter==="all"?allCards():allCards().filter(id=>id[0]===filter);
  return (
    <div style={{maxWidth:560,margin:"0 auto",padding:"24px 20px"}}>
      <BackBtn onClick={()=>setScreen("home")}/>
      <h2 style={{fontFamily:"'Playfair Display',serif",color:"#aac4e8",fontSize:20,marginBottom:14}}>Kartenbilder bearbeiten</h2>
      <div style={{display:"flex",gap:7,marginBottom:12,flexWrap:"wrap"}}>
        {[["all","Alle"],...SUITS.map(s=>[s,`${s} ${SUIT_LABELS[s]}`])].map(([v,l])=>(
          <button key={v} onClick={()=>setFilter(v)} style={{
            background:filter===v?"rgba(170,196,232,0.18)":"transparent",
            border:`1.5px solid ${filter===v?"#aac4e8":"#444"}`,
            borderRadius:7,padding:"3px 11px",cursor:"pointer",color:"#e8dcc8",fontSize:12,
          }}>{l}</button>
        ))}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:5,maxHeight:"58vh",overflowY:"auto",paddingRight:3}}>
        {cards.map(id=>(
          <div key={id} style={{display:"flex",alignItems:"center",gap:9,padding:"6px 10px",background:"rgba(255,255,255,0.025)",borderRadius:9}}>
            <CardFace id={id}/>
            <div style={{width:86,flexShrink:0,fontSize:11,color:"#666"}}>{cardLabel(id)}</div>
            <input value={local[id]||""} onChange={e=>setLocal({...local,[id]:e.target.value})} placeholder="Bild…" style={{...baseInput,flex:1}}/>
          </div>
        ))}
      </div>
      <button onClick={()=>{updateCardImages(local);setSaved(true);setTimeout(()=>setSaved(false),1500);}}
        style={{...aBtn("#aac4e8"),marginTop:14,width:"100%",flex:"none"}}>
        {saved?"✓ Gespeichert!":"Speichern"}
      </button>
    </div>
  );
}

function EditMajorScreen({ majorSystem, updateMajorSystem, setScreen }) {
  const [local, setLocal] = useState({...majorSystem});
  const [saved, setSaved] = useState(false);
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(99);
  const nums = Array.from({length:100},(_,i)=>String(i).padStart(2,"0")).filter(n=>parseInt(n)>=from&&parseInt(n)<=to);
  return (
    <div style={{maxWidth:560,margin:"0 auto",padding:"24px 20px"}}>
      <BackBtn onClick={()=>setScreen("home")}/>
      <h2 style={{fontFamily:"'Playfair Display',serif",color:"#f5c842",fontSize:20,marginBottom:14}}>Major System bearbeiten</h2>
      <div style={{display:"flex",gap:9,alignItems:"center",marginBottom:12}}>
        <label style={{color:"#aaa",fontSize:12}}>Von:</label>
        <input type="number" min={0} max={99} value={from} onChange={e=>setFrom(Math.max(0,parseInt(e.target.value)||0))} style={{...baseInput,width:54}}/>
        <label style={{color:"#aaa",fontSize:12}}>Bis:</label>
        <input type="number" min={0} max={99} value={to} onChange={e=>setTo(Math.min(99,parseInt(e.target.value)||99))} style={{...baseInput,width:54}}/>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:5,maxHeight:"58vh",overflowY:"auto",paddingRight:3}}>
        {nums.map(n=>(
          <div key={n} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 10px",background:"rgba(255,255,255,0.025)",borderRadius:9}}>
            <div style={{width:36,textAlign:"center",fontSize:18,fontWeight:900,color:"#f5c842",fontFamily:"'Playfair Display',serif",flexShrink:0}}>{parseInt(n)}</div>
            <input value={local[n]||""} onChange={e=>setLocal({...local,[n]:e.target.value})} placeholder="Bild…" style={{...baseInput,flex:1}}/>
          </div>
        ))}
      </div>
      <button onClick={()=>{updateMajorSystem(local);setSaved(true);setTimeout(()=>setSaved(false),1500);}}
        style={{...aBtn("#f5c842"),marginTop:14,width:"100%",flex:"none"}}>
        {saved?"✓ Gespeichert!":"Speichern"}
      </button>
    </div>
  );
}

// ─── STATS ────────────────────────────────────────────────────────────────────

function StatsScreen({ stats, updateStats, setScreen }) {
  const entries = Object.entries(stats).sort((a,b)=>{
    const ra=a[1].correct/(a[1].correct+a[1].wrong||1);
    const rb=b[1].correct/(b[1].correct+b[1].wrong||1);
    return ra-rb;
  });
  return (
    <div style={{maxWidth:560,margin:"0 auto",padding:"24px 20px"}}>
      <BackBtn onClick={()=>setScreen("home")}/>
      <h2 style={{fontFamily:"'Playfair Display',serif",color:"#e86c6c",fontSize:20,marginBottom:14}}>Statistik</h2>
      {!entries.length && <p style={{color:"#555",fontSize:14}}>Noch keine Übungen durchgeführt.</p>}
      <div style={{display:"flex",flexDirection:"column",gap:5,maxHeight:"65vh",overflowY:"auto"}}>
        {entries.map(([key,val])=>{
          const total=val.correct+val.wrong;
          const pct=Math.round(val.correct/total*100);
          const c=pct>=80?"#7ec8a0":pct>=50?"#f5c842":"#e86c6c";
          return (
            <div key={key} style={{display:"flex",alignItems:"center",gap:9,padding:"6px 10px",background:"rgba(255,255,255,0.025)",borderRadius:9}}>
              <div style={{flex:1,fontSize:11,color:"#666"}}>{key}</div>
              <div style={{width:90,height:4,background:"#222",borderRadius:2}}>
                <div style={{width:`${pct}%`,height:"100%",background:c,borderRadius:2}}/>
              </div>
              <div style={{width:34,textAlign:"right",fontSize:11,color:c}}>{pct}%</div>
              <div style={{fontSize:10,color:"#444"}}>{val.correct}/{total}</div>
            </div>
          );
        })}
      </div>
      {entries.length>0 && (
        <button onClick={()=>{if(window.confirm("Alle Statistiken zurücksetzen?"))updateStats({});}}
          style={{...aBtn("#e86c6c"),marginTop:14,flex:"none"}}>Statistik zurücksetzen</button>
      )}
    </div>
  );
}
