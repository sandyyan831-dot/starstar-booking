import { useState } from "react";
import {
  TESTIMONIALS, STORY, DEMO_TESTIMONIALS, DEMO_STORY,
  PAIN_POINTS, REPORT_ITEMS, STEPS, FAQ,
} from "./landingContent.js";

const F = "'Noto Sans TC','PingFang TC','Microsoft JhengHei','Helvetica Neue',sans-serif";
const C = { ink:"#4a3b22", sub:"#8a7a5c", gold:"#b09650", deep:"#8a7340", line:"#e8dfca", card:"#fffdf8", hl:"#f1de9a" };
const wrap = { maxWidth:680, margin:"0 auto", padding:"0 20px", fontFamily:F, color:C.ink };

const LINE_URL = "https://line.me/R/ti/p/@754atiwp";
const IG_URL = "https://www.instagram.com/starstarlive";

const demo = typeof window !== "undefined" && import.meta.env.DEV && window.location.search.includes("demo");
const testimonials = demo ? DEMO_TESTIMONIALS : TESTIMONIALS;
const story = demo ? DEMO_STORY : STORY;

function goTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior:"smooth", block:"start" });
}

/* ── 共用小元件 ── */
function Section({ id, children, style }) {
  return <section id={id} style={{ ...wrap, padding:"28px 20px", scrollMarginTop:8, ...style }}>{children}</section>;
}
function H2({ children }) {
  return <h2 style={{ fontSize:"clamp(23px, 6vw, 30px)", fontWeight:900, lineHeight:1.45, margin:"0 0 14px", letterSpacing:0.5 }}>{children}</h2>;
}
function P({ children, style }) {
  return <p style={{ fontSize:16, lineHeight:1.95, margin:"0 0 14px", color:"#5d4e33", ...style }}>{children}</p>;
}
function Mark({ children }) {
  return <span style={{ background:`linear-gradient(transparent 62%, ${C.hl} 62%)`, padding:"0 3px" }}>{children}</span>;
}
function Button({ children, onClick, href, primary = true }) {
  const style = {
    display:"inline-block", padding:"14px 22px", borderRadius:12, fontFamily:F, fontSize:16, fontWeight:700,
    textDecoration:"none", cursor:"pointer", letterSpacing:1, textAlign:"center",
    border: primary ? "none" : `1.5px solid ${C.gold}`,
    background: primary ? "linear-gradient(135deg, #e3c36a, #c9a84e)" : "transparent",
    color: primary ? "#3d3015" : C.deep,
    boxShadow: primary ? "0 3px 14px rgba(176,150,80,0.28)" : "none",
  };
  return href
    ? <a href={href} target="_blank" rel="noopener noreferrer" style={style}>{children}</a>
    : <button onClick={onClick} style={style}>{children}</button>;
}

/* ── 上半部：主視覺 → 痛點 → 共鳴 → 換個起點 → 星盤 → 故事 → 回饋 ── */
function PainChips() {
  const [picked, setPicked] = useState(new Set());
  const toggle = (i) => setPicked(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
  return (
    <Section>
      <H2>這是在講你嗎？</H2>
      <P style={{ color:C.sub, marginBottom:16 }}>符合的就點一下。</P>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {PAIN_POINTS.map((t, i) => {
          const on = picked.has(i);
          return (
            <button key={t} onClick={() => toggle(i)} style={{
              display:"flex", alignItems:"center", gap:12, textAlign:"left",
              padding:"15px 16px", borderRadius:14, fontFamily:F, fontSize:16, fontWeight:on ? 700 : 500,
              border:`1.5px solid ${on ? C.gold : C.line}`,
              background:on ? "#f8efd2" : C.card, color:C.ink, cursor:"pointer", transition:"all 0.2s",
            }}>
              <span style={{
                flexShrink:0, width:22, height:22, borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center",
                border:`1.5px solid ${on ? C.gold : "#d8ccb0"}`, background:on ? C.gold : "transparent", color:"#fff", fontSize:14,
              }}>{on ? "✓" : ""}</span>
              {t}
            </button>
          );
        })}
      </div>
      {picked.size > 0 && (
        <div style={{ marginTop:18, padding:"18px 18px", borderRadius:14, background:C.card, border:`1px solid ${C.line}` }}>
          <P style={{ margin:"0 0 14px", fontWeight:700 }}>
            有 {picked.size} 項符合。你缺的也許不是更多方法，<Mark>而是更了解眼前這個孩子</Mark>。
          </P>
          <Button onClick={() => goTo("booking")}>看看怎麼開始 ↓</Button>
        </div>
      )}
    </Section>
  );
}

export function LandingTop() {
  return (
    <>
      {/* 主視覺 */}
      <section style={{ ...wrap, padding:"40px 20px 12px" }}>
        <div style={{ fontSize:14, letterSpacing:5, color:C.gold, fontWeight:700, marginBottom:30 }}>✧ 星語・星心</div>
        <p style={{ fontSize:15, fontWeight:700, color:C.deep, margin:"0 0 12px", letterSpacing:1 }}>給罵完孩子就自責的爸媽</p>
        <h1 style={{ fontSize:"clamp(30px, 8.4vw, 46px)", fontWeight:900, lineHeight:1.4, margin:"0 0 22px", letterSpacing:0.5 }}>
          看了這麼多教養書跟教養文，<br />都只存在你的<Mark>資料夾</Mark>裡嗎？
        </h1>
        <P>道理都懂，卻還是會在罵完孩子之後，自責、愧疚。</P>
        <P>也許不是你不夠努力，而是那些方法，<strong>從來沒有對著「你的孩子」說</strong>。</P>
        <div style={{ display:"flex", flexWrap:"wrap", gap:12, marginTop:22 }}>
          <Button onClick={() => goTo("booking")}>預約，看懂孩子</Button>
          {testimonials.length > 0 && <Button primary={false} onClick={() => goTo("voices")}>看真實回饋</Button>}
        </div>
      </section>

      <PainChips />

      {/* 共鳴 */}
      <Section>
        <H2>你不是不夠努力</H2>
        <P>收藏夾裡有幾十篇教養文，書架上也排了好幾本教養書。</P>
        <P>每一篇都說得有道理，但放到自己孩子身上，不是沒用，就是做到一半又破功。</P>
        <P>然後某個晚上，你又吼了孩子。等他睡著，你看著那張臉，開始自責。</P>
        <P style={{ fontWeight:700, color:C.ink }}>這不是意志力的問題。<Mark>同一套方法，不一定適合每一個孩子。</Mark></P>
      </Section>

      {/* 換一個起點 */}
      <Section>
        <H2>換一個起點</H2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))", gap:12 }}>
          <div style={{ padding:"20px 18px", borderRadius:16, background:"#f3eee4", border:`1px solid ${C.line}` }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.sub, letterSpacing:2, marginBottom:12 }}>以前</div>
            {["照著「通用教養法」一個一個試", "孩子沒反應，就懷疑自己哪裡做錯", "看越多越慌，越慌越容易失控", "罵完，只剩下自責"].map(t => (
              <div key={t} style={{ fontSize:15, lineHeight:1.8, color:"#7a6d55", padding:"3px 0" }}>・{t}</div>
            ))}
          </div>
          <div style={{ padding:"20px 18px", borderRadius:16, background:"#fbf3d9", border:`1.5px solid ${C.gold}` }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.deep, letterSpacing:2, marginBottom:12 }}>現在</div>
            {["先看懂孩子「本來的樣子」", "了解他的個性、學習節奏、手足與同儕相處", "選擇適合他的回應方式", "做決定時，多一個依據，少一點猜"].map(t => (
              <div key={t} style={{ fontSize:15, lineHeight:1.8, color:C.ink, fontWeight:600, padding:"3px 0" }}>・{t}</div>
            ))}
          </div>
        </div>
      </Section>

      {/* 星盤是什麼 */}
      <Section>
        <H2>星盤，是看懂孩子的<Mark>一個角度</Mark></H2>
        <P>它不是標準答案，也不會替你決定怎麼教孩子。它像是一份線索，讓你先知道這個孩子本來是什麼樣子。</P>
        <div style={{ padding:"18px 18px", borderRadius:16, background:C.card, border:`1px solid ${C.line}`, margin:"18px 0 14px" }}>
          <div style={{ fontSize:14, fontWeight:700, color:C.deep, marginBottom:12, letterSpacing:1 }}>「解碼孩子的星盤天賦」報告內含</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {REPORT_ITEMS.map(r => (
              <div key={r.text} style={{ display:"flex", alignItems:"center", gap:8, fontSize:15, fontWeight:600, lineHeight:1.5 }}>
                <span style={{ color:C.gold, fontSize:18 }}>{r.icon}</span>{r.text}
              </div>
            ))}
          </div>
        </div>
        <P style={{ fontSize:14.5, color:C.sub }}>也可以先從自己開始：「本命盤解析」會看你的個性特質、家庭、婚姻、事業與人際。</P>
      </Section>

      {/* 故事（有填才顯示） */}
      {story && (
        <Section>
          <H2>{story.title}</H2>
          {story.paragraphs.map((p, i) => <P key={i}>{p}</P>)}
        </Section>
      )}

      {/* 真實回饋（有填才顯示） */}
      {testimonials.length > 0 && (
        <Section id="voices" style={{ paddingRight:0 }}>
          <H2>真實回饋</H2>
          <P style={{ color:C.sub, marginBottom:14 }}>每一則，都是客人預約後的真實分享。</P>
          <div className="voices-row" style={{
            display:"flex", gap:12, overflowX:"auto", scrollSnapType:"x mandatory",
            padding:"4px 20px 14px 0", scrollbarWidth:"none",
          }}>
            {testimonials.map((t, i) => (
              <figure key={i} style={{
                flex:"0 0 82%", maxWidth:340, scrollSnapAlign:"start", margin:0,
                padding:"20px 18px", borderRadius:16, background:C.card, border:`1px solid ${C.line}`,
                boxShadow:"0 2px 14px rgba(160,140,100,0.08)", display:"flex", flexDirection:"column", gap:12,
              }}>
                {t.image && <img src={t.image} alt="" style={{ width:"100%", borderRadius:10, display:"block" }} />}
                <blockquote style={{ margin:0, fontSize:15.5, lineHeight:1.9, color:C.ink, whiteSpace:"pre-wrap" }}>{t.text}</blockquote>
                <figcaption style={{ fontSize:13, color:C.sub, marginTop:"auto" }}>
                  <strong style={{ color:C.deep }}>{t.name}</strong>　{t.service}
                </figcaption>
              </figure>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

/* 接在預約區塊前面的標題（也是「預約」錨點） */
export function StartHeading() {
  return (
    <section id="booking" style={{ ...wrap, padding:"36px 20px 4px", scrollMarginTop:8 }}>
      <H2>從這裡開始</H2>
      <P style={{ color:C.sub, marginBottom:6 }}>點選想預約的項目，再選日期與時段。</P>
    </section>
  );
}

/* ── 下半部：流程 → 常見問題 → 結尾 ── */
function FaqItem({ q, a }) {
  return (
    <details style={{ borderBottom:`1px solid ${C.line}`, padding:"4px 0" }}>
      <summary style={{ cursor:"pointer", listStyle:"none", display:"flex", justifyContent:"space-between", gap:12, padding:"14px 0", fontSize:16, fontWeight:700, lineHeight:1.6 }}>
        <span>{q}</span><span style={{ color:C.gold, flexShrink:0 }}>＋</span>
      </summary>
      <div style={{ fontSize:15, lineHeight:1.9, color:"#5d4e33", padding:"0 0 16px" }}>{a}</div>
    </details>
  );
}

export function LandingBottom() {
  return (
    <>
      <style>{`
        .voices-row::-webkit-scrollbar { display:none; }
        details > summary::-webkit-details-marker { display:none; }
        details[open] > summary > span:last-child { transform:rotate(45deg); }
      `}</style>

      <Section style={{ marginTop:36 }}>
        <H2>預約流程</H2>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {STEPS.map((s, i) => (
            <div key={s.title} style={{ display:"flex", gap:14, padding:"16px 16px", borderRadius:14, background:C.card, border:`1px solid ${C.line}` }}>
              <div style={{
                flexShrink:0, width:34, height:34, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
                background:"linear-gradient(135deg, #e3c36a, #c9a84e)", color:"#3d3015", fontWeight:900, fontSize:16,
              }}>{i + 1}</div>
              <div>
                <div style={{ fontSize:16, fontWeight:700, marginBottom:2 }}>{s.title}</div>
                <div style={{ fontSize:14.5, lineHeight:1.8, color:"#6b5c3e" }}>{s.text}</div>
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

      <Section style={{ padding:"36px 20px 12px" }}>
        <div style={{ padding:"32px 22px", borderRadius:20, textAlign:"center", background:"linear-gradient(145deg, #fbf3d9, #f1e2b0)", border:`1.5px solid ${C.gold}` }}>
          <h2 style={{ fontSize:"clamp(22px, 6vw, 28px)", fontWeight:900, lineHeight:1.5, margin:"0 0 10px" }}>
            想更知道怎麼陪他，<br />從<Mark>看懂他</Mark>開始。
          </h2>
          <P style={{ color:"#6b5c3e", margin:"0 0 20px" }}>選一個你方便的時間，剩下的交給我。</P>
          <div style={{ display:"flex", flexWrap:"wrap", gap:12, justifyContent:"center" }}>
            <Button onClick={() => goTo("booking")}>回到上方選時段</Button>
            <Button primary={false} href={LINE_URL}>有問題，先 LINE 問我</Button>
          </div>
        </div>
      </Section>

      <footer style={{ ...wrap, padding:"28px 20px 8px", textAlign:"center" }}>
        <p style={{ fontSize:12.5, lineHeight:1.9, color:C.sub, margin:"0 0 14px" }}>
          占星提供的是理解與反思的角度，不取代醫療、心理或教育專業的建議。
        </p>
        <div style={{ display:"flex", gap:20, justifyContent:"center", fontSize:14, marginBottom:10 }}>
          <a href={LINE_URL} target="_blank" rel="noopener noreferrer" style={{ color:C.deep, textDecoration:"none", fontWeight:600 }}>LINE 官方帳號</a>
          <a href={IG_URL} target="_blank" rel="noopener noreferrer" style={{ color:C.deep, textDecoration:"none", fontWeight:600 }}>Instagram</a>
        </div>
        <p style={{ fontSize:12, color:"#b5a98c", margin:0 }}>© 2026 星語・星心</p>
      </footer>
    </>
  );
}
