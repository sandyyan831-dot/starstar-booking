import { useState, useEffect } from "react";
import {
  TESTIMONIALS, ABOUT,
  PAIN_POINTS, REPORT_ITEMS, STEPS, FAQ, GETS,
} from "./landingContent.js";

/* ── 設計代幣：奶油底 ＋ 深黃色塊 ＋ 夜藍星空 ── */
const F = "'Noto Sans TC','PingFang TC','Microsoft JhengHei','Helvetica Neue',sans-serif";
const FS = "'Noto Serif TC','Songti TC','PMingLiU',serif";
const C = {
  ink:"#3a4f5e", sub:"#6a737c", gold2:"#3f6f8d", line:"#ece4d2", paper:"#ffffff", cream:"#faf7f0",
  mustard:"#f4d675", mustardDeep:"#d9b84f", mustardPale:"#f9e7a8", butter:"#f8e39b",   // 奶油黃：按鈕與標籤用 mustard，大色塊用 butter
  night:"#3a4f5e", nightDeep:"#26363f", gold:"#f4d675",              // 深藍：只用在文字與按鈕，不做大色塊
  sky:"#e6eff5", skyMid:"#b8d4ea", skyLine:"#c9dce9",                // 淺藍→中藍：色塊用
  skyGrad:"linear-gradient(160deg, #eef5fa 0%, #e6eff5 55%, #cfe1ef 100%)",
};
const wrap = { maxWidth:680, marginLeft:"auto", marginRight:"auto", padding:"0 20px", fontFamily:F, color:C.ink };

const LINE_URL = "https://line.me/R/ti/p/@754atiwp";
const IG_URL = "https://www.instagram.com/starpsyastro";

const testimonials = TESTIMONIALS;

function goTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior:"smooth", block:"start" });
}

/* ── 小零件 ── */
function Sparkle({ size = 18, color = C.mustard, style }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" style={{ display:"block", ...style }}>
      <path d="M12 0C12.8 7 17 11.2 24 12C17 12.8 12.8 17 12 24C11.2 17 7 12.8 0 12C7 11.2 11.2 7 12 0Z" fill={color} />
    </svg>
  );
}

// 夜空裡的小星點（固定位置，不會每次都不一樣）
const STARS = [
  [8,14,1.6],[22,8,1.2],[37,22,1.8],[55,10,1.3],[71,18,2],[88,9,1.4],[93,30,1.6],
  [6,46,1.4],[18,62,1.9],[33,78,1.2],[49,88,1.6],[64,72,1.3],[80,84,1.8],[92,64,1.2],[12,92,1.5],
].map(([x, y, r]) => `radial-gradient(${r}px ${r}px at ${x}% ${y}%, #f9e7a8 55%, transparent 60%)`).join(",");


function Section({ id, children, style }) {
  return <section id={id} style={{ ...wrap, padding:"30px 20px", scrollMarginTop:8, ...style }}>{children}</section>;
}

// 圓角色塊：一段一段交錯，讓頁面有節奏
function Band({ tone = "mustard", id, children, style }) {
  const t = {
    mustard: { background:C.butter, color:"#3a4f5e" },
    sky:     { background:C.skyGrad, color:C.ink },
    pale:    { background:"#fbf0c8", color:"#3a4f5e" },
  }[tone];
  return (
    <div id={id} style={{
      position:"relative", overflow:"hidden", maxWidth:720, width:"calc(100% - 20px)", margin:"26px auto",
      borderRadius:32, fontFamily:F, scrollMarginTop:8, ...t, ...style,
    }}>
      <div style={{ ...wrap, padding:"44px 22px", color:t.color }}>{children}</div>
    </div>
  );
}

function H2({ children, color, style }) {
  return <h2 style={{ fontSize:"clamp(24px, 6.4vw, 31px)", fontWeight:900, lineHeight:1.45, margin:"0 0 14px", letterSpacing:0.5, color:color || C.ink, ...style }}>{children}</h2>;
}
function P({ children, style, serif }) {
  return <p style={{ fontSize:16, lineHeight:1.95, margin:"0 0 14px", color:"#4a5560", fontFamily:serif ? FS : F, ...style }}>{children}</p>;
}
// 螢光筆劃線
function Mark({ children, dark }) {
  if (dark) {
    return <span style={{ color:C.gold, textDecoration:"underline", textDecorationColor:C.mustard, textDecorationThickness:3, textUnderlineOffset:7 }}>{children}</span>;
  }
  return <span style={{ background:`linear-gradient(transparent 58%, ${C.mustardPale} 58%)`, padding:"0 3px" }}>{children}</span>;
}

function Button({ children, onClick, href, variant = "primary" }) {
  const v = {
    primary: { background:C.mustard, color:C.night, border:"none", boxShadow:`0 4px 0 ${C.mustardDeep}`, shadow:C.mustardDeep },
    dark:    { background:C.night, color:C.gold, border:"none", boxShadow:`0 4px 0 ${C.nightDeep}`, shadow:C.nightDeep },
    outline: { background:"transparent", color:C.night, border:`2px solid ${C.night}`, boxShadow:"none" },
    gold:    { background:"transparent", color:C.gold, border:`2px solid ${C.mustard}`, boxShadow:"none" },
  }[variant];
  const { shadow, ...rest } = v;
  const style = {
    display:"inline-block", padding:"14px 22px", borderRadius:14, fontFamily:F, fontSize:16, fontWeight:900,
    textDecoration:"none", cursor:"pointer", letterSpacing:1, textAlign:"center", ...rest,
  };
  return href
    ? <a href={href} target="_blank" rel="noopener noreferrer" className="lp-btn" style={style}>{children}</a>
    : <button onClick={onClick} className="lp-btn" style={style}>{children}</button>;
}

/* ── 痛點勾選 ── */
function PainChips() {
  const [picked, setPicked] = useState(new Set());
  const toggle = (i) => setPicked(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
  return (
    <Section>
      <div style={{ display:"inline-block", transform:"rotate(-2deg)", background:C.night, color:C.gold, borderRadius:10, padding:"4px 12px", fontSize:13, fontWeight:700, letterSpacing:1, marginBottom:12 }}>
        符合的就點一下
      </div>
      <H2>這是在講你嗎？</H2>
      <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:6 }}>
        {PAIN_POINTS.map((t, i) => {
          const on = picked.has(i);
          return (
            <button key={t} onClick={() => toggle(i)} style={{
              display:"flex", alignItems:"center", gap:12, textAlign:"left",
              padding:"15px 16px", borderRadius:16, fontFamily:F, fontSize:16, fontWeight:on ? 900 : 500,
              border:`2px solid ${on ? C.night : C.line}`,
              background:on ? C.mustard : C.paper, color:C.ink, cursor:"pointer", transition:"all 0.18s",
              transform:on ? "translateY(-1px)" : "none",
              boxShadow:on ? `0 3px 0 ${C.night}` : "none",
            }}>
              <span style={{
                flexShrink:0, width:24, height:24, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center",
                border:`2px solid ${on ? C.night : "#c9c2ae"}`, background:on ? C.night : "transparent", color:C.gold, fontSize:14, fontWeight:900,
              }}>{on ? "✓" : ""}</span>
              {t}
            </button>
          );
        })}
      </div>
      {picked.size > 0 && (
        <div style={{ marginTop:18, padding:"20px 20px", borderRadius:20, background:C.skyGrad, color:C.ink, border:`1.5px solid ${C.skyLine}`, position:"relative", overflow:"hidden" }}>
          <Sparkle size={20} color={C.mustard} style={{ position:"absolute", top:12, right:14 }} />
          <p style={{ margin:"0 0 16px", fontSize:17, lineHeight:1.85, fontWeight:700, fontFamily:FS }}>
            有 {picked.size} 項符合。你缺的也許不是更多方法，<span style={{ color:C.night, background:`linear-gradient(transparent 58%, ${C.mustardPale} 58%)` }}>而是更了解眼前這個孩子</span>。
          </p>
          <Button onClick={() => goTo("booking")}>看看怎麼開始 ↓</Button>
        </div>
      )}
    </Section>
  );
}

/* ── 預約後，你會得到什麼 ── */
function Gets() {
  const big = [
    { bg:C.mustard, color:C.ink, sub:"#4a5560", tile:C.night, tileColor:C.gold, shadow:C.mustardDeep },
    { bg:C.skyGrad, color:C.ink, sub:"#4a5560", tile:C.mustard, tileColor:C.night, shadow:C.skyLine },
  ];
  return (
    <Section id="gets">
      <H2>{GETS.title}</H2>
      <P serif style={{ fontSize:17, fontWeight:500, marginBottom:18 }}>{GETS.lead}</P>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {GETS.main.map((g, i) => (
          <div key={g.title} style={{
            background:big[i].bg, color:big[i].color, borderRadius:22, padding:"22px 20px",
            boxShadow:`0 4px 0 ${big[i].shadow}`, display:"flex", gap:14, alignItems:"flex-start",
          }}>
            <div style={{
              flexShrink:0, width:46, height:46, borderRadius:14, background:big[i].tile, color:big[i].tileColor,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, fontWeight:900,
            }}>{g.icon}</div>
            <div>
              <div style={{ fontSize:19, fontWeight:900, lineHeight:1.45, marginBottom:6 }}>{g.title}</div>
              <div style={{ fontSize:15.5, lineHeight:1.85, color:big[i].sub }}>{g.text}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:12, marginTop:14 }}>
        {GETS.more.map(g => (
          <div key={g.title} style={{ background:C.paper, border:`2px solid ${C.line}`, borderRadius:18, padding:"16px 16px", display:"flex", gap:12, alignItems:"flex-start" }}>
            <div style={{ flexShrink:0, width:34, height:34, borderRadius:11, background:C.mustard, color:C.night, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:900 }}>{g.icon}</div>
            <div>
              <div style={{ fontSize:16, fontWeight:900, marginBottom:2 }}>{g.title}</div>
              <div style={{ fontSize:14.5, lineHeight:1.75, color:"#6a737c" }}>{g.text}</div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ── 關於我 ── */
function About({ onPick }) {
  const [full, setFull] = useState(false);
  const a = ABOUT;
  const story = full ? a.storyFull : a.storyShort;
  return (
    <Section id="about" style={{ paddingTop:20 }}>
      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
        <div style={{
          flexShrink:0, width:64, height:64, borderRadius:"50%", overflow:"hidden", background:C.mustard, color:C.night,
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, fontWeight:900, fontFamily:FS,
          border:`3px solid ${C.night}`, boxShadow:`0 3px 0 ${C.night}`,
        }}>
          {a.photo ? <img src={a.photo} alt={a.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : a.name.slice(0, 1)}
        </div>
        <div>
          <div style={{ fontSize:13, color:C.sub, letterSpacing:2, fontWeight:700 }}>我是 {a.name}</div>
          <div style={{ fontSize:14, color:C.sub }}>占星解盤・也是一位媽媽</div>
        </div>
      </div>
      <H2>{a.headline}</H2>
      <P serif style={{ fontSize:17, fontWeight:500 }}>{a.lead}</P>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:10, margin:"22px 0 16px" }}>
        {a.credentials.map((c, i) => (
          <div key={c.big} style={{
            background:[C.butter, C.skyGrad, C.skyMid][i % 3], borderRadius:18, padding:"16px 3px", textAlign:"center",
            transform:`rotate(${[-1.5, 1, -0.8][i % 3]}deg)`, boxShadow:`0 3px 0 ${[C.mustardDeep, C.skyLine, "#8fb4cc"][i % 3]}`,
          }}>
            <div style={{ fontSize:15, fontWeight:900, lineHeight:1.35, whiteSpace:"nowrap", color:C.night }}>{c.big}</div>
            <div style={{ fontSize:11.5, color:["#4a5560", "#4a5560", "#4a5560"][i % 3], marginTop:4, fontWeight:500 }}>{c.small}</div>
          </div>
        ))}
      </div>

      <div style={{ background:C.paper, border:`1.5px solid ${C.line}`, borderRadius:18, padding:"16px 18px", marginBottom:22 }}>
        <div style={{ fontSize:13, fontWeight:900, color:C.gold2, letterSpacing:2, marginBottom:8 }}>我也是走過來的媽媽</div>
        {a.journey.map(t => (
          <div key={t} style={{ display:"flex", gap:10, alignItems:"flex-start", fontSize:15.5, lineHeight:1.8, padding:"2px 0" }}>
            <Sparkle size={13} style={{ marginTop:9, flexShrink:0 }} />{t}
          </div>
        ))}
      </div>

      <div style={{ borderLeft:`5px solid ${C.mustard}`, padding:"4px 0 4px 18px", margin:"0 0 6px" }}>
        {story.map((t, i) => (
          <P key={i} serif style={{ fontSize:16.5, lineHeight:2, margin:"0 0 12px" }}>{t}</P>
        ))}
      </div>
      <button onClick={() => setFull(f => !f)} style={{
        background:"none", border:"none", padding:"6px 0 0 23px", cursor:"pointer", fontFamily:F, fontSize:14.5, fontWeight:900, color:C.gold2, letterSpacing:1,
      }}>{full ? "收合 ▴" : "看完整故事 ▾"}</button>

      {/* 直接預約整張星盤 */}
      <div style={{ marginTop:30, padding:"26px 22px", borderRadius:24, background:"#fbf0c8", color:C.ink, border:`2px solid ${C.mustard}`, position:"relative", overflow:"hidden" }}>
        <Sparkle size={26} color={C.mustard} style={{ position:"absolute", top:14, right:16 }} />
        <h3 style={{ fontSize:"clamp(20px, 5.4vw, 25px)", fontWeight:900, lineHeight:1.5, margin:"0 40px 8px 0", color:C.night }}>{a.cta.title}</h3>
        <p style={{ fontSize:15.5, lineHeight:1.9, margin:"0 0 18px", color:"#4a5560" }}>{a.cta.text}</p>
        <div style={{ display:"flex", flexWrap:"wrap", gap:12 }}>
          <Button variant="dark" onClick={() => onPick ? onPick("child") : goTo("booking")}>解碼孩子的星盤</Button>
          <Button variant="outline" onClick={() => onPick ? onPick("first") : goTo("booking")}>本命盤解析</Button>
        </div>
      </div>
    </Section>
  );
}

/* ── 真實回饋：一塊底板，幾則短評語散落其上，點開才看全部 ── */
const PANEL = "#e6eff5";
const SCATTER = [
  { w:58, align:"flex-start", rot:-1.5 },
  { w:44, align:"flex-end",   rot:1.5 },
  { w:52, align:"flex-start", rot:1 },
];

function VoicesViewer({ items, onClose }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label="真實回饋" style={{
      position:"fixed", inset:0, zIndex:2000, background:PANEL, overflowY:"auto", WebkitOverflowScrolling:"touch", fontFamily:F, color:C.ink,
    }}>
      <div style={{
        position:"sticky", top:0, zIndex:1, display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"14px 18px", background:"rgba(230,239,245,0.96)", backdropFilter:"blur(8px)", borderBottom:`1px solid ${C.line}`,
      }}>
        <div style={{ fontSize:17, fontWeight:900 }}>真實回饋<span style={{ fontSize:13, fontWeight:500, color:C.sub, marginLeft:8 }}>共 {items.length} 則</span></div>
        <button onClick={onClose} aria-label="關閉" style={{
          width:38, height:38, borderRadius:"50%", border:`1.5px solid ${C.night}`, background:C.paper, color:C.night, fontSize:18, cursor:"pointer",
        }}>✕</button>
      </div>
      <div style={{ maxWidth:480, margin:"0 auto", padding:"18px 16px 36px", display:"flex", flexDirection:"column", gap:14 }}>
        {items.map((t) => (
          <img key={t.image} src={t.image} alt={t.alt || "客人回饋"} loading="lazy" decoding="async"
            style={{ display:"block", width:"100%", height:"auto", mixBlendMode:"multiply", borderRadius:18 }} />
        ))}
        <div style={{ textAlign:"center", paddingTop:12 }}>
          <Button onClick={() => { onClose(); setTimeout(() => goTo("booking"), 60); }}>我也想預約</Button>
        </div>
      </div>
    </div>
  );
}

function Voices({ items }) {
  const [open, setOpen] = useState(false);
  const teasers = items.filter(t => t.teaser).sort((a, b) => a.teaser - b.teaser).slice(0, SCATTER.length);
  return (
    <Section id="voices">
      <H2 style={{ fontSize:22, marginBottom:4 }}>真實回饋</H2>
      <P style={{ color:C.sub, fontSize:14, marginBottom:12 }}>每一則，都是客人的真實分享。</P>
      <div onClick={() => setOpen(true)} role="button" tabIndex={0}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(true); } }}
        style={{
          position:"relative", overflow:"hidden", cursor:"pointer", borderRadius:24, background:PANEL,
          border:`1.5px solid #c9dce9`, padding:"14px 14px 64px",
        }}>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {teasers.map((t, i) => {
            const sc = SCATTER[i % SCATTER.length];
            return (
              <img key={t.image} src={t.image} alt={t.alt || "客人回饋"} loading="lazy" decoding="async" style={{
                display:"block", width:`${sc.w}%`, alignSelf:sc.align, transform:`rotate(${sc.rot}deg)`,
                mixBlendMode:"multiply", borderRadius:16,
              }} />
            );
          })}
        </div>
        <div style={{
          position:"absolute", left:0, right:0, bottom:0, padding:"34px 14px 12px", textAlign:"center",
          background:`linear-gradient(rgba(230,239,245,0), ${PANEL} 60%)`,
        }}>
          <span style={{
            display:"inline-block", padding:"9px 16px", borderRadius:12, background:C.mustard, color:C.night,
            fontSize:13.5, fontWeight:900, letterSpacing:1, boxShadow:`0 4px 0 ${C.mustardDeep}`,
          }}>點開看全部 {items.length} 則回饋 →</span>
        </div>
      </div>
      {open && <VoicesViewer items={items} onClose={() => setOpen(false)} />}
    </Section>
  );
}

/* ── 上半部：主視覺 → 痛點 → 共鳴 → 換個起點 → 星盤 → 關於我 → 回饋 ── */
export function LandingTop({ onPick }) {
  return (
    <>
      <style>{`
        .lp-btn { transition: transform .12s, box-shadow .12s; }
        .lp-btn:active { transform: translateY(3px); box-shadow: none !important; }
        details > summary::-webkit-details-marker { display:none; }
        details[open] > summary .lp-plus { transform: rotate(45deg); }
      `}</style>

      {/* 主視覺 */}
      <section style={{ ...wrap, padding:"38px 20px 14px", position:"relative" }}>
        <Sparkle size={26} style={{ position:"absolute", top:30, right:22 }} />
        <Sparkle size={13} color={C.night} style={{ position:"absolute", top:68, right:58, opacity:0.5 }} />
        <Sparkle size={16} style={{ position:"absolute", top:290, right:14, opacity:0.7 }} />
        <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:14, letterSpacing:5, color:C.gold2, fontWeight:900, marginBottom:28 }}>
          <Sparkle size={14} /> 星語・星心
        </div>
        <div style={{
          display:"inline-block", transform:"rotate(-2deg)", background:C.mustard, color:C.night, borderRadius:12,
          padding:"7px 14px", fontSize:15, fontWeight:900, letterSpacing:1, marginBottom:18, boxShadow:`0 3px 0 ${C.mustardDeep}`,
        }}>給罵完孩子就自責的爸媽</div>
        <h1 style={{ fontSize:"clamp(26px, 8.2vw, 46px)", fontWeight:900, lineHeight:1.45, margin:"0 0 22px", letterSpacing:0.5, color:C.night }}>
          看了這麼多教養書跟<br />教養文，都只存在你的<br /><Mark>資料夾</Mark>裡嗎？
        </h1>
        <P serif style={{ fontSize:17.5, fontWeight:500 }}>道理都懂，卻還是會在罵完孩子之後，自責、愧疚。</P>
        <P serif style={{ fontSize:17.5, fontWeight:500 }}>也許不是你不夠努力，而是那些方法，<strong style={{ fontWeight:900 }}>從來沒有對著「你的孩子」說</strong>。</P>
        <div style={{ display:"flex", flexWrap:"wrap", gap:14, marginTop:24 }}>
          <Button onClick={() => goTo("booking")}>預約，看懂孩子</Button>
          {testimonials.length > 0 && <Button variant="outline" onClick={() => goTo("voices")}>看真實回饋</Button>}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:26, fontSize:13.5, color:C.sub, lineHeight:1.6 }}>
          <span style={{ flexShrink:0, width:34, height:34, borderRadius:"50%", background:C.night, color:C.gold, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:FS, fontWeight:900 }}>{ABOUT.name.slice(0, 1)}</span>
          <span>{ABOUT.name}｜臨床心理背景，也是花了很久才當上媽媽的人</span>
        </div>
      </section>

      <PainChips />

      {/* 共鳴：深黃色塊 */}
      <Band tone="mustard">
        <Sparkle size={22} color={C.night} style={{ position:"absolute", top:20, right:22, opacity:0.85 }} />
        <H2 color={C.night}>你不是不夠努力</H2>
        <P serif style={{ color:"#4a5560", fontSize:17 }}>收藏夾裡有幾十篇教養文，書架上也排了好幾本教養書。</P>
        <P serif style={{ color:"#4a5560", fontSize:17 }}>每一篇都說得有道理，但放到自己孩子身上，不是沒用，就是做到一半又破功。</P>
        <P serif style={{ color:"#4a5560", fontSize:17 }}>然後某個晚上，你又吼了孩子。等他睡著，你看著那張臉，開始自責。</P>
        <p style={{ margin:"22px 0 0", fontSize:18, fontWeight:900, lineHeight:1.7, color:C.night }}>
          這不是意志力的問題。<br />
          <span style={{ display:"inline-block", marginTop:6, background:C.night, color:C.gold, padding:"6px 14px", borderRadius:12, transform:"rotate(-1deg)" }}>
            同一套方法，不一定適合每一個孩子。
          </span>
        </p>
      </Band>

      {/* 換一個起點 */}
      <Section>
        <H2>換一個起點</H2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))", gap:14 }}>
          <div style={{ padding:"22px 18px", borderRadius:22, background:"#f1eee6", border:"2px dashed #d9d2c0" }}>
            <div style={{ fontSize:13, fontWeight:900, color:"#55606a", letterSpacing:3, marginBottom:12 }}>以前</div>
            {["照著「通用教養法」一個一個試", "孩子沒反應，就懷疑自己哪裡做錯", "看越多越慌，越慌越容易失控", "罵完，只剩下自責"].map(t => (
              <div key={t} style={{ display:"flex", gap:8, fontSize:15, lineHeight:1.8, color:"#55606a", padding:"3px 0" }}>
                <span style={{ flexShrink:0, color:"#c4472c", fontWeight:900 }}>✕</span>{t}
              </div>
            ))}
          </div>
          <div style={{ padding:"22px 18px", borderRadius:22, background:"#fbf0c8", color:C.ink, border:`2px solid ${C.mustard}`, position:"relative", overflow:"hidden" }}>
            <div style={{ display:"inline-block", fontSize:13, fontWeight:900, background:C.mustard, color:C.night, borderRadius:8, padding:"2px 10px", letterSpacing:3, marginBottom:12 }}>現在</div>
            {["先看懂孩子「本來的樣子」", "了解他的個性、學習、手足與同儕", "選擇適合他的回應方式", "做決定時，多一個依據，少一點猜"].map(t => (
              <div key={t} style={{ display:"flex", gap:8, fontSize:15, lineHeight:1.8, fontWeight:700, padding:"3px 0" }}>
                <span style={{ flexShrink:0, color:C.gold2, fontWeight:900 }}>✓</span>{t}
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* 星盤：夜空色塊 */}
      <Band tone="sky">
        <Sparkle size={20} style={{ position:"absolute", top:22, right:24 }} />
        <H2 color={C.night}>星盤，是看懂孩子的<br /><Mark>一個角度</Mark></H2>
        <P serif style={{ color:"#4a5560", fontSize:17 }}>它不是標準答案，也不會替你決定怎麼教孩子。它像是一份線索，讓你先知道這個孩子本來是什麼樣子、怎麼想的。</P>
        <div style={{ fontSize:14, fontWeight:900, color:C.night, letterSpacing:1.5, margin:"22px 0 12px" }}>「解碼孩子的星盤天賦」報告內含</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {REPORT_ITEMS.map(r => (
            <div key={r.text} style={{
              display:"flex", alignItems:"center", gap:8, fontSize:15, fontWeight:700, lineHeight:1.5, padding:"12px 12px",
              borderRadius:14, border:`1.5px solid ${C.skyLine}`, background:"rgba(255,255,255,0.7)",
            }}>
              <span style={{ color:C.gold2, fontSize:18 }}>{r.icon}</span>{r.text}
            </div>
          ))}
        </div>
        <p style={{ fontSize:14, lineHeight:1.9, color:"#4a5560", margin:"18px 0 0" }}>也可以先從自己開始：「本命盤解析」會看你的個性特質、家庭、婚姻、事業與人際。</p>
      </Band>

      <Gets />

      <About onPick={onPick} />

      {testimonials.length > 0 && <Voices items={testimonials} />}
    </>
  );
}

/* 接在預約區塊前面的標題（也是「預約」錨點） */
export function StartHeading() {
  return (
    <section id="booking" style={{ ...wrap, padding:"34px 20px 4px", scrollMarginTop:8 }}>
      <H2>從這裡開始</H2>
      <P style={{ color:C.sub, marginBottom:6 }}>點選想預約的項目，再選日期與時段。</P>
    </section>
  );
}

/* ── 下半部：流程 → 常見問題 → 結尾 ── */
function FaqItem({ q, a }) {
  return (
    <details style={{ borderBottom:`1px solid ${C.line}`, padding:"2px 0" }}>
      <summary style={{ cursor:"pointer", listStyle:"none", display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, padding:"14px 0", fontSize:16, fontWeight:900, lineHeight:1.6 }}>
        <span>{q}</span>
        <span className="lp-plus" style={{ flexShrink:0, width:26, height:26, borderRadius:"50%", background:C.mustard, color:C.night, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, lineHeight:1, transition:"transform .2s" }}>＋</span>
      </summary>
      <div style={{ fontSize:15, lineHeight:1.9, color:"#4a5560", padding:"0 0 16px" }}>{a}</div>
    </details>
  );
}

export function LandingBottom({ onPick }) {
  return (
    <>
      <Section style={{ marginTop:34 }}>
        <H2>預約流程</H2>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {STEPS.map((s, i) => (
            <div key={s.title} style={{ display:"flex", gap:14, padding:"16px 16px", borderRadius:18, background:C.paper, border:`1.5px solid ${C.line}` }}>
              <div style={{
                flexShrink:0, width:36, height:36, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center",
                background:C.mustard, color:C.night, fontWeight:900, fontSize:17, boxShadow:`0 3px 0 ${C.mustardDeep}`,
              }}>{i + 1}</div>
              <div>
                <div style={{ fontSize:16, fontWeight:900, marginBottom:2 }}>{s.title}</div>
                <div style={{ fontSize:14.5, lineHeight:1.8, color:"#6a737c" }}>{s.text}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <H2>常被問的</H2>
        <div style={{ borderTop:`1px solid ${C.line}` }}>
          {FAQ.map(f => <FaqItem key={f.q} {...f} />)}
        </div>
      </Section>

      {/* 結尾：銘黃色塊 */}
      <Band tone="mustard" style={{ textAlign:"center" }}>
        <Sparkle size={22} color={C.night} style={{ position:"absolute", top:20, left:22, opacity:0.85 }} />
        <Sparkle size={14} color={C.night} style={{ position:"absolute", top:54, right:30, opacity:0.5 }} />
        <h2 style={{ fontSize:"clamp(23px, 6.4vw, 30px)", fontWeight:900, lineHeight:1.55, margin:"0 0 10px", color:C.night }}>
          想更知道怎麼陪他，<br />從<span style={{ display:"inline-block", background:C.night, color:C.gold, padding:"0 10px", borderRadius:10, transform:"rotate(-1deg)", margin:"0 2px" }}>看懂他</span>開始。
        </h2>
        <p style={{ fontSize:16, lineHeight:1.9, color:"#4a5560", margin:"0 0 22px", fontFamily:FS }}>選一個你方便的時間，<br />剩下的交給我。</p>
        <div style={{ display:"flex", flexWrap:"wrap", gap:14, justifyContent:"center" }}>
          <Button variant="dark" onClick={() => goTo("booking")}>回到上方選時段</Button>
          <Button variant="outline" href={LINE_URL}>有問題，先 LINE 問我</Button>
        </div>
      </Band>

      <footer style={{ ...wrap, padding:"6px 20px 8px", textAlign:"center" }}>
        <p style={{ fontSize:12.5, lineHeight:1.9, color:C.sub, margin:"0 0 14px" }}>
          占星提供的是理解與反思的角度，不取代醫療、心理或教育專業的建議。
        </p>
        <div style={{ display:"flex", gap:22, justifyContent:"center", fontSize:14, marginBottom:10 }}>
          <a href={LINE_URL} target="_blank" rel="noopener noreferrer" style={{ color:C.gold2, textDecoration:"none", fontWeight:900 }}>LINE 官方帳號</a>
          <a href={IG_URL} target="_blank" rel="noopener noreferrer" style={{ color:C.gold2, textDecoration:"none", fontWeight:900 }}>Instagram</a>
        </div>
        <p style={{ fontSize:12, color:"#6a737c", margin:0 }}>© 2026 星語・星心</p>
      </footer>
    </>
  );
}
