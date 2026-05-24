import { useState, useEffect, useCallback, useMemo } from "react";
import { db } from "./firebase.js";
import {
  collection, doc, setDoc, getDocs, query, orderBy
} from "firebase/firestore";

/* ── Config ── */
const SLOT_CONFIG = {
  days: [3, 4, 5],
  slots: [
    { label: "上午 10:00–12:00", id: "morning" },
    { label: "下午 2:00–4:00", id: "afternoon" },
  ],
};

const CONSULT_TYPES = [
  { id: "first", label: "本命盤解析", tag: "第一次諮詢", desc: "至少 1 小時起", price: 3000, priceLabel: "$3,000", icon: "☽" },
  { id: "child", label: "解碼孩子的星盤天賦", tag: "親子星盤", desc: "至少 1 小時起", price: 3000, priceLabel: "$3,000", icon: "✧" },
  { id: "returning", label: "問問題 ／ 流年", tag: "已諮詢過", desc: "半小時起算", price: 1500, priceLabel: "$1,500", icon: "◦" },
];

const TAIWAN_CITIES = [
  "台北市","新北市","基隆市","桃園市","新竹市","新竹縣",
  "苗栗縣","台中市","彰化縣","南投縣","雲林縣","嘉義市",
  "嘉義縣","台南市","高雄市","屏東縣","宜蘭縣","花蓮縣",
  "台東縣","澎湖縣","金門縣","連江縣",
];

const PAYMENT_INFO = { account: "銀行：國泰世華（013）\n帳號：220506083214" };

/* ── Helpers ── */
function getNext2MonthsDates() {
  const dates = [];
  const today = new Date(); today.setHours(0,0,0,0);
  const end = new Date(today); end.setMonth(end.getMonth() + 2);
  let d = new Date(today); d.setDate(d.getDate() + 1);
  while (d <= end) {
    if (SLOT_CONFIG.days.includes(d.getDay())) dates.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

function formatDate(date) {
  const y = date.getFullYear(), m = date.getMonth()+1, d = date.getDate();
  const dn = ["日","一","二","三","四","五","六"];
  return `${y}/${m}/${d}（${dn[date.getDay()]}）`;
}

function dateKey(date, slotId) {
  return `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}_${slotId}`;
}

/* ── Decorative Components ── */
function StarScatter() {
  const stars = useMemo(() => {
    const s = [];
    for (let i = 0; i < 35; i++) {
      s.push({
        left: `${Math.random()*100}%`, top: `${Math.random()*100}%`,
        size: 1 + Math.random()*2.5, opacity: 0.08 + Math.random()*0.18,
        delay: Math.random()*6,
      });
    }
    return s;
  }, []);
  return (
    <div style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden" }}>
      {stars.map((s,i) => (
        <div key={i} style={{
          position:"absolute", left:s.left, top:s.top,
          width:s.size, height:s.size, borderRadius:"50%",
          background:"#b09650", opacity:s.opacity,
          animation: `twinkle ${3+Math.random()*4}s ease-in-out ${s.delay}s infinite alternate`,
        }} />
      ))}
    </div>
  );
}

function ConstellationDeco({ style }) {
  return (
    <svg viewBox="0 0 200 200" style={{ position:"absolute", opacity:0.12, pointerEvents:"none", ...style }} xmlns="http://www.w3.org/2000/svg">
      <g stroke="#b09650" strokeWidth="0.7" fill="none">
        <line x1="30" y1="40" x2="80" y2="25" /><line x1="80" y1="25" x2="120" y2="60" />
        <line x1="120" y1="60" x2="90" y2="110" /><line x1="90" y1="110" x2="140" y2="140" />
        <line x1="140" y1="140" x2="170" y2="100" /><line x1="50" y1="150" x2="90" y2="110" />
        <line x1="30" y1="40" x2="50" y2="150" />
      </g>
      <g fill="#b09650">
        <circle cx="30" cy="40" r="2.5"/><circle cx="80" cy="25" r="2"/><circle cx="120" cy="60" r="3"/>
        <circle cx="90" cy="110" r="2.5"/><circle cx="140" cy="140" r="2"/><circle cx="170" cy="100" r="1.8"/>
        <circle cx="50" cy="150" r="2.2"/>
      </g>
    </svg>
  );
}

/* ── Month Calendar ── */
function MonthCalendar({ year, month, availableDates, bookedSlots, onSelect }) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const dayNames = ["日","一","二","三","四","五","六"];
  const availMap = {};
  availableDates.forEach(d => {
    if (d.getFullYear()===year && d.getMonth()===month) availMap[d.getDate()] = d;
  });
  const cells = [];
  for (let i=0; i<firstDay; i++) cells.push(null);
  for (let d=1; d<=daysInMonth; d++) cells.push(d);

  return (
    <div style={{ marginBottom:44 }}>
      <h3 style={{
        fontFamily:"'Cormorant Garamond', serif", fontSize:22,
        color:"#8a7340", marginBottom:16, letterSpacing:3, textAlign:"center", fontWeight:600,
      }}>{year} 年 {month+1} 月</h3>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:4 }}>
        {dayNames.map(n => (
          <div key={n} style={{
            textAlign:"center", fontFamily:"'Noto Sans TC', sans-serif",
            fontSize:11, color:"#b5a27a", padding:"6px 0", fontWeight:500,
          }}>{n}</div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
        {cells.map((day,i) => {
          if (day===null) return <div key={`e${i}`}/>;
          const dateObj = availMap[day];
          if (!dateObj) {
            return (
              <div key={day} style={{
                textAlign:"center", padding:"8px 2px", fontFamily:"'Noto Sans TC', sans-serif",
                fontSize:13, color:"#d5cbba", borderRadius:10, minHeight:78,
              }}><div>{day}</div></div>
            );
          }
          const mB = bookedSlots.has(dateKey(dateObj,"morning"));
          const aB = bookedSlots.has(dateKey(dateObj,"afternoon"));
          const allB = mB && aB;
          return (
            <div key={day} style={{
              textAlign:"center", padding:"7px 3px", fontFamily:"'Noto Sans TC', sans-serif",
              fontSize:13, color:allB?"#c8bfae":"#6b5c3e",
              background:allB?"#f5f0e6":"#faf6ef",
              border:`1px solid ${allB?"#ebe5d8":"#e0d5be"}`,
              borderRadius:10, minHeight:78, opacity:allB?0.55:1,
              display:"flex", flexDirection:"column", alignItems:"center", gap:3,
              transition:"all 0.3s",
            }}>
              <div style={{ fontWeight:700, marginBottom:2, fontSize:14 }}>{day}</div>
              {SLOT_CONFIG.slots.map(slot => {
                const booked = bookedSlots.has(dateKey(dateObj,slot.id));
                const short = slot.id==="morning"?"上午":"下午";
                return (
                  <button key={slot.id} disabled={booked} onClick={()=>onSelect(dateObj,slot)}
                    style={{
                      width:"92%", padding:"4px 0", borderRadius:6, fontSize:10,
                      border:booked?"1px solid #e5ddd0":"1px solid #cbba95",
                      background:booked?"#f0ebe2":"linear-gradient(135deg, #faf5ea, #f3ecdb)",
                      color:booked?"#c5baa8":"#8a7340",
                      cursor:booked?"not-allowed":"pointer",
                      fontFamily:"'Noto Sans TC', sans-serif",
                      textDecoration:booked?"line-through":"none",
                      transition:"all 0.2s", fontWeight:600, letterSpacing:1,
                    }}
                    onMouseEnter={e=>{if(!booked){e.target.style.background="linear-gradient(135deg, #efe6d0, #e8ddc5)";e.target.style.borderColor="#b09650";}}}
                    onMouseLeave={e=>{if(!booked){e.target.style.background="linear-gradient(135deg, #faf5ea, #f3ecdb)";e.target.style.borderColor="#cbba95";}}}
                  >{booked?"已約":short}</button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Booking Form ── */
function BookingForm({ date, slot, onSubmit, onCancel, submitting }) {
  const [consultType, setConsultType] = useState(null);
  const [form, setForm] = useState({
    line:"", birthYear:"", birthMonth:"", birthDay:"",
    birthHour:"", birthMinute:"",
    birthPlace:"", overseasCountry:"", overseasRegion:"",
    question:"",
  });
  const [errors, setErrors] = useState({});
  const update = (f,v) => { setForm(p=>({...p,[f]:v})); setErrors(e=>({...e,[f]:undefined})); };

  const validate = () => {
    const e = {};
    if (!consultType) e.consultType="請選擇諮詢類型";
    if (!form.line.trim()) e.line="請填寫";
    if (!form.birthYear.trim()) e.birthYear="必填";
    if (!form.birthMonth.trim()) e.birthMonth="必填";
    if (!form.birthDay.trim()) e.birthDay="必填";
    if (!form.birthHour.trim()) e.birthHour="必填";
    if (!form.birthMinute.trim()) e.birthMinute="必填";
    if (!form.birthPlace) e.birthPlace="請選擇";
    if (form.birthPlace==="國外") {
      if (!form.overseasCountry.trim()) e.overseasCountry="請填寫國家";
      if (!form.overseasRegion.trim()) e.overseasRegion="請填寫地區";
    }
    if (!form.question.trim()) e.question="請填寫";
    setErrors(e); return Object.keys(e).length===0;
  };
  const handleSubmit = () => { if(validate() && !submitting) onSubmit({...form, consultType}); };

  const inputBase = (field) => ({
    width:"100%", padding:"11px 14px", borderRadius:10,
    border:`1.5px solid ${errors[field]?"#d4836a":"#ddd2bb"}`,
    background:"#fffdf8", color:"#5a4d35",
    fontFamily:"'Noto Sans TC', sans-serif", fontSize:14,
    outline:"none", transition:"border-color 0.3s", boxSizing:"border-box",
  });
  const lbl = { display:"block", fontFamily:"'Noto Sans TC', sans-serif", fontSize:13, color:"#8a7340", marginBottom:6, fontWeight:600 };
  const errS = { fontSize:11, color:"#d4836a", marginTop:3 };
  const focusH = e=>{ e.target.style.borderColor="#b09650"; };
  const blurH = field => e=>{ e.target.style.borderColor=errors[field]?"#d4836a":"#ddd2bb"; };

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(245,240,232,0.85)",
      backdropFilter:"blur(12px)", display:"flex", alignItems:"center",
      justifyContent:"center", zIndex:1000, padding:16,
    }}>
      <div style={{
        background:"linear-gradient(170deg, #fefcf7 0%, #f8f3ea 100%)",
        border:"1.5px solid #ddd2bb", borderRadius:20,
        padding:"28px 24px", maxWidth:520, width:"100%",
        maxHeight:"92vh", overflowY:"auto", position:"relative",
        boxShadow:"0 8px 40px rgba(160,140,100,0.12)",
      }}>
        <button onClick={onCancel} style={{
          position:"absolute", top:14, right:16, background:"none",
          border:"none", color:"#b5a27a", fontSize:20, cursor:"pointer",
        }}>✕</button>

        <h2 style={{
          fontFamily:"'Cormorant Garamond', serif", fontSize:24,
          color:"#8a7340", marginBottom:4, fontWeight:600,
        }}>預約占星諮詢</h2>
        <p style={{
          fontFamily:"'Noto Sans TC', sans-serif", fontSize:13,
          color:"#b5a27a", marginBottom:22,
        }}>{formatDate(date)}　{slot.label}</p>

        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* Consult Type */}
          <div>
            <label style={lbl}>諮詢類型 <span style={{color:"#d4836a"}}>*</span></label>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {CONSULT_TYPES.map(t => {
                const sel = consultType===t.id;
                return (
                  <button key={t.id} onClick={()=>{setConsultType(t.id);setErrors(e=>({...e,consultType:undefined}));}}
                    style={{
                      textAlign:"left", padding:"14px 16px", borderRadius:12,
                      border:`1.5px solid ${sel?"#b09650":"#e5ddd0"}`,
                      background:sel?"linear-gradient(135deg, #f5ecd5, #efe4c8)":"#fdfaf3",
                      cursor:"pointer", transition:"all 0.25s",
                    }}
                    onMouseEnter={e=>{if(!sel)e.currentTarget.style.borderColor="#cbba95";}}
                    onMouseLeave={e=>{if(!sel)e.currentTarget.style.borderColor="#e5ddd0";}}
                  >
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                      <span style={{ fontSize:16, color:"#b09650" }}>{t.icon}</span>
                      <span style={{
                        fontFamily:"'Noto Sans TC', sans-serif", fontSize:14,
                        color:sel?"#7a6530":"#6b5c3e", fontWeight:700,
                      }}>{t.label}</span>
                      <span style={{
                        fontSize:10, color:"#b5a27a", background:"rgba(176,150,80,0.1)",
                        padding:"2px 8px", borderRadius:4, fontFamily:"'Noto Sans TC', sans-serif",
                      }}>{t.tag}</span>
                    </div>
                    <div style={{
                      fontFamily:"'Noto Sans TC', sans-serif", fontSize:12,
                      color:"#b5a27a", paddingLeft:24,
                    }}>{t.desc}　｜　費用 {t.priceLabel}</div>
                  </button>
                );
              })}
            </div>
            {errors.consultType && <div style={errS}>{errors.consultType}</div>}
          </div>

          {/* Line */}
          <div>
            <label style={lbl}>Line 帳號</label>
            <input style={inputBase("line")} placeholder="請輸入您的 Line ID"
              value={form.line} onChange={e=>update("line",e.target.value)}
              onFocus={focusH} onBlur={blurH("line")} />
            {errors.line && <div style={errS}>{errors.line}</div>}
          </div>

          {/* Birth date */}
          <div>
            <label style={lbl}>出生日期</label>
            <div style={{ display:"grid", gridTemplateColumns:"1.3fr 0.85fr 0.85fr", gap:8 }}>
              {[["birthYear","年（如 1990）"],["birthMonth","月"],["birthDay","日"]].map(([f,ph])=>(
                <div key={f}>
                  <input style={{...inputBase(f), textAlign:"center"}} placeholder={ph}
                    value={form[f]} onChange={e=>update(f,e.target.value)}
                    onFocus={focusH} onBlur={blurH(f)} />
                  {errors[f] && <div style={errS}>{errors[f]}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Birth time */}
          <div>
            <label style={lbl}>出生時間</label>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {[["birthHour","時（24hr）"],["birthMinute","分"]].map(([f,ph])=>(
                <div key={f}>
                  <input style={{...inputBase(f), textAlign:"center"}} placeholder={ph}
                    value={form[f]} onChange={e=>update(f,e.target.value)}
                    onFocus={focusH} onBlur={blurH(f)} />
                  {errors[f] && <div style={errS}>{errors[f]}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Birth place */}
          <div>
            <label style={lbl}>出生地</label>
            <select style={{...inputBase("birthPlace"), appearance:"none",
              backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%23b09650' stroke-width='1.5'/%3E%3C/svg%3E")`,
              backgroundRepeat:"no-repeat", backgroundPosition:"right 12px center", paddingRight:32,
            }}
              value={form.birthPlace} onChange={e=>update("birthPlace",e.target.value)}
              onFocus={focusH} onBlur={blurH("birthPlace")}
            >
              <option value="">請選擇出生地</option>
              {TAIWAN_CITIES.map(c=><option key={c} value={c}>{c}</option>)}
              <option value="國外">國外</option>
            </select>
            {errors.birthPlace && <div style={errS}>{errors.birthPlace}</div>}
            {form.birthPlace==="國外" && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:10 }}>
                <div>
                  <input style={inputBase("overseasCountry")} placeholder="國家"
                    value={form.overseasCountry} onChange={e=>update("overseasCountry",e.target.value)}
                    onFocus={focusH} onBlur={blurH("overseasCountry")} />
                  {errors.overseasCountry && <div style={errS}>{errors.overseasCountry}</div>}
                </div>
                <div>
                  <input style={inputBase("overseasRegion")} placeholder="地區／城市"
                    value={form.overseasRegion} onChange={e=>update("overseasRegion",e.target.value)}
                    onFocus={focusH} onBlur={blurH("overseasRegion")} />
                  {errors.overseasRegion && <div style={errS}>{errors.overseasRegion}</div>}
                </div>
              </div>
            )}
          </div>

          {/* Question */}
          <div>
            <label style={lbl}>想要問的問題</label>
            <textarea style={{...inputBase("question"), minHeight:80, resize:"vertical"}}
              placeholder="請描述您想諮詢的問題方向…"
              value={form.question} onChange={e=>update("question",e.target.value)}
              onFocus={focusH} onBlur={blurH("question")} />
            {errors.question && <div style={errS}>{errors.question}</div>}
          </div>

          <button onClick={handleSubmit} disabled={submitting} style={{
            width:"100%", padding:"14px 0", borderRadius:12, border:"none",
            background: submitting
              ? "#ccc"
              : "linear-gradient(135deg, #c9ab5a 0%, #b09650 50%, #a08940 100%)",
            color:"#fffdf8", fontFamily:"'Noto Sans TC', sans-serif",
            fontSize:15, fontWeight:700, cursor:submitting?"wait":"pointer", letterSpacing:3,
            marginTop:4, transition:"all 0.2s",
            boxShadow:"0 2px 12px rgba(176,150,80,0.25)",
          }}
            onMouseEnter={e=>{if(!submitting){e.target.style.boxShadow="0 4px 20px rgba(176,150,80,0.35)";e.target.style.transform="translateY(-1px)";}}}
            onMouseLeave={e=>{if(!submitting){e.target.style.boxShadow="0 2px 12px rgba(176,150,80,0.25)";e.target.style.transform="translateY(0)";}}}
          >{submitting ? "預約中…" : "確認預約"}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Confirmation ── */
function ConfirmationModal({ date, slot, consultType, onClose }) {
  const ct = CONSULT_TYPES.find(t=>t.id===consultType);
  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(245,240,232,0.85)",
      backdropFilter:"blur(12px)", display:"flex", alignItems:"center",
      justifyContent:"center", zIndex:1000, padding:16,
    }}>
      <div style={{
        background:"linear-gradient(170deg, #fefcf7 0%, #f8f3ea 100%)",
        border:"1.5px solid #ddd2bb", borderRadius:20,
        padding:"32px 24px", maxWidth:480, width:"100%", textAlign:"center",
        boxShadow:"0 8px 40px rgba(160,140,100,0.12)",
      }}>
        <div style={{ fontSize:36, marginBottom:10, color:"#b09650" }}>✧</div>
        <h2 style={{
          fontFamily:"'Cormorant Garamond', serif", fontSize:24,
          color:"#8a7340", marginBottom:6,
        }}>預約已送出</h2>
        <p style={{
          fontFamily:"'Noto Sans TC', sans-serif", fontSize:13,
          color:"#b5a27a", marginBottom:4, lineHeight:1.7,
        }}>{formatDate(date)}　{slot.label}</p>
        <p style={{
          fontFamily:"'Noto Sans TC', sans-serif", fontSize:13,
          color:"#8a7340", marginBottom:22, fontWeight:600,
        }}>{ct?.icon} {ct?.label}</p>

        <div style={{
          background:"linear-gradient(135deg, #f5ecd5, #efe4c8)",
          border:"1.5px solid #ddd2bb", borderRadius:14,
          padding:"18px 22px", marginBottom:22, textAlign:"left",
        }}>
          <p style={{
            fontFamily:"'Noto Sans TC', sans-serif", fontSize:14,
            color:"#8a7340", fontWeight:700, marginBottom:10,
          }}>✦ 匯款資訊</p>
          <p style={{
            fontFamily:"'Noto Sans TC', sans-serif", fontSize:13,
            color:"#7a6a4a", whiteSpace:"pre-line", lineHeight:1.9, marginBottom:10,
          }}>{PAYMENT_INFO.account}</p>
          <p style={{
            fontFamily:"'Noto Sans TC', sans-serif", fontSize:16,
            color:"#7a6530", fontWeight:700,
          }}>應匯金額：{ct?.priceLabel}</p>
        </div>

        <p style={{
          fontFamily:"'Noto Sans TC', sans-serif", fontSize:12,
          color:"#b5a27a", lineHeight:1.9, marginBottom:22,
        }}>
          請於預約後 <strong style={{color:"#8a7340"}}>3 天內</strong> 完成匯款<br/>
          匯款完成後請透過 Line 傳送匯款截圖<br/>
          確認收款後才算正式完成預約 ✧
        </p>

        <button onClick={onClose} style={{
          padding:"11px 36px", borderRadius:10,
          border:"1.5px solid #cbba95", background:"transparent",
          color:"#8a7340", fontFamily:"'Noto Sans TC', sans-serif",
          fontSize:14, cursor:"pointer", transition:"all 0.25s", fontWeight:600,
        }}
          onMouseEnter={e=>{e.target.style.background="rgba(176,150,80,0.08)";}}
          onMouseLeave={e=>{e.target.style.background="transparent";}}
        >我知道了</button>
      </div>
    </div>
  );
}

/* ── Main App ── */
export default function App() {
  const [bookedSlots, setBookedSlots] = useState(new Set());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [lastConsultType, setLastConsultType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const dates = useMemo(() => getNext2MonthsDates(), []);
  const months = useMemo(() => {
    const m = {};
    dates.forEach(d => {
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      if (!m[k]) m[k] = { year:d.getFullYear(), month:d.getMonth() };
    });
    const now = new Date();
    const ck = `${now.getFullYear()}-${now.getMonth()}`;
    if (!m[ck]) m[ck] = { year:now.getFullYear(), month:now.getMonth() };
    return Object.values(m).sort((a,b) => a.year-b.year || a.month-b.month);
  }, [dates]);

  /* Load booked slots from Firestore */
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "bookings"));
        const slots = new Set();
        snap.forEach(doc => {
          const data = doc.data();
          if (data.slotKey) slots.add(data.slotKey);
        });
        setBookedSlots(slots);
      } catch (e) {
        console.error("Failed to load bookings:", e);
      }
      setLoading(false);
    })();
  }, []);

  const handleSelect = (date, slot) => {
    setSelectedDate(date); setSelectedSlot(slot); setShowForm(true);
  };

  const handleSubmit = async (formData) => {
    setSubmitting(true);
    const key = dateKey(selectedDate, selectedSlot.id);
    const ct = CONSULT_TYPES.find(t => t.id === formData.consultType);

    const bookingData = {
      slotKey: key,
      date: formatDate(selectedDate),
      time: selectedSlot.label,
      consultType: ct?.label || "",
      consultTag: ct?.tag || "",
      price: ct?.price || 0,
      line: formData.line,
      birthYear: formData.birthYear,
      birthMonth: formData.birthMonth,
      birthDay: formData.birthDay,
      birthHour: formData.birthHour,
      birthMinute: formData.birthMinute,
      birthPlace: formData.birthPlace === "國外"
        ? `國外 — ${formData.overseasCountry}・${formData.overseasRegion}`
        : formData.birthPlace,
      question: formData.question,
      bookedAt: new Date().toISOString(),
      paymentStatus: "待匯款",
    };

    try {
      await setDoc(doc(db, "bookings", key), bookingData);
      const nb = new Set(bookedSlots);
      nb.add(key);
      setBookedSlots(nb);
      setLastConsultType(formData.consultType);
      setShowForm(false);
      setShowConfirmation(true);
    } catch (e) {
      console.error("Booking failed:", e);
      alert("預約失敗，請稍後再試。");
    }
    setSubmitting(false);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Noto+Sans+TC:wght@300;400;500;700&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { background:#faf6ef; }
        ::-webkit-scrollbar { width:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#ddd2bb; border-radius:3px; }
        @keyframes twinkle { 0%{opacity:0.06;} 100%{opacity:0.28;} }
        @keyframes floatIn { 0%{opacity:0;transform:translateY(12px);} 100%{opacity:1;transform:translateY(0);} }
      `}</style>

      <div style={{
        minHeight:"100vh",
        background:"linear-gradient(180deg, #faf6ef 0%, #f5f0e6 30%, #f0eadd 70%, #ece5d6 100%)",
        color:"#5a4d35", padding:"0 0 50px 0", position:"relative", overflow:"hidden",
      }}>
        <StarScatter />
        <ConstellationDeco style={{ width:180, top:20, right:-20 }} />
        <ConstellationDeco style={{ width:150, bottom:100, left:-30, transform:"rotate(120deg)" }} />

        <div style={{
          position:"absolute", top:0, left:0, right:0, height:2,
          background:"linear-gradient(90deg, transparent 5%, #c9ab5a 30%, #dcc470 50%, #c9ab5a 70%, transparent 95%)",
          opacity:0.5,
        }} />

        {/* Header */}
        <div style={{ textAlign:"center", padding:"48px 20px 16px", position:"relative", animation:"floatIn 0.8s ease-out" }}>
          <svg viewBox="0 0 120 120" style={{ width:60, height:60, margin:"0 auto 12px", display:"block", opacity:0.3 }}>
            <circle cx="60" cy="60" r="50" fill="none" stroke="#b09650" strokeWidth="0.8" strokeDasharray="3 5" />
            <circle cx="60" cy="60" r="38" fill="none" stroke="#b09650" strokeWidth="0.5" strokeDasharray="2 4" />
            <circle cx="60" cy="60" r="3" fill="#b09650" opacity="0.5" />
          </svg>
          <h1 style={{
            fontFamily:"'Cormorant Garamond', serif",
            fontSize:"clamp(28px, 6vw, 42px)", fontWeight:600,
            color:"#7a6530", letterSpacing:6, marginBottom:8, lineHeight:1.4,
          }}>星語<span style={{color:"#c9ab5a",margin:"0 6px"}}>・</span>星心</h1>
          <p style={{
            fontFamily:"'Noto Sans TC', sans-serif", fontSize:15,
            color:"#a08940", letterSpacing:4, marginBottom:6, fontWeight:500,
          }}>占星諮詢預約</p>
          <p style={{
            fontFamily:"'Cormorant Garamond', serif", fontSize:13,
            color:"#c4b48a", letterSpacing:2, fontStyle:"italic",
          }}>explore the stars, find your direction</p>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, margin:"20px auto 0" }}>
            <div style={{ width:40, height:1, background:"linear-gradient(90deg, transparent, #c9ab5a)" }} />
            <div style={{ width:5, height:5, borderRadius:"50%", background:"#c9ab5a", opacity:0.5 }} />
            <div style={{ width:40, height:1, background:"linear-gradient(270deg, transparent, #c9ab5a)" }} />
          </div>
        </div>

        {/* Info pills */}
        <div style={{ maxWidth:680, margin:"20px auto 12px", padding:"0 16px" }}>
          <div style={{ display:"flex", flexWrap:"wrap", gap:10, justifyContent:"center" }}>
            {[
              { icon:"✦", text:"每週三、四、五" },
              { icon:"✦", text:"上午 10–12 ／ 下午 2–4" },
              { icon:"✦", text:"諮詢費 $1,500 ／半小時" },
            ].map((item,i)=>(
              <div key={i} style={{
                background:"rgba(201,171,90,0.06)", border:"1px solid rgba(201,171,90,0.18)",
                borderRadius:20, padding:"7px 16px",
                fontFamily:"'Noto Sans TC', sans-serif", fontSize:12,
                color:"#a08940", fontWeight:500,
              }}>{item.icon} {item.text}</div>
            ))}
          </div>
        </div>

        {/* Consult type cards */}
        <div style={{ maxWidth:680, margin:"0 auto 36px", padding:"0 16px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(190px, 1fr))", gap:10 }}>
            {CONSULT_TYPES.map(t=>(
              <div key={t.id} style={{
                background:"linear-gradient(145deg, #fdfaf3, #f5ecd5)",
                border:"1px solid #e0d5be", borderRadius:14, padding:"14px 16px",
                position:"relative", overflow:"hidden",
              }}>
                <div style={{
                  position:"absolute", top:0, right:0, width:50, height:50,
                  background:"radial-gradient(circle at 100% 0%, rgba(201,171,90,0.12), transparent 70%)",
                }} />
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                  <span style={{ fontSize:14, color:"#b09650" }}>{t.icon}</span>
                  <span style={{
                    fontFamily:"'Noto Sans TC', sans-serif", fontSize:13,
                    color:"#7a6530", fontWeight:700,
                  }}>{t.label}</span>
                </div>
                <div style={{
                  fontFamily:"'Noto Sans TC', sans-serif", fontSize:11,
                  color:"#b5a27a", lineHeight:1.6,
                }}>{t.desc}　｜　{t.priceLabel}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Calendar */}
        <div style={{ maxWidth:680, margin:"0 auto", padding:"0 16px", position:"relative" }}>
          {loading ? (
            <div style={{ textAlign:"center", padding:50, fontFamily:"'Noto Sans TC', sans-serif", color:"#c4b48a" }}>載入中…</div>
          ) : (
            months.map(m=>(
              <MonthCalendar key={`${m.year}-${m.month}`}
                year={m.year} month={m.month}
                availableDates={dates} bookedSlots={bookedSlots}
                onSelect={handleSelect}
              />
            ))
          )}
        </div>

        <div style={{
          textAlign:"center", marginTop:40,
          fontFamily:"'Noto Sans TC', sans-serif", fontSize:11,
          color:"#c4b48a", letterSpacing:2,
        }}>✧ 點選日期時段即可開始預約 ✧</div>

        <div style={{
          position:"absolute", bottom:0, left:0, right:0, height:1,
          background:"linear-gradient(90deg, transparent 10%, #c9ab5a 40%, #dcc470 50%, #c9ab5a 60%, transparent 90%)",
          opacity:0.3,
        }} />

        {showForm && selectedDate && selectedSlot && (
          <BookingForm date={selectedDate} slot={selectedSlot}
            onSubmit={handleSubmit} onCancel={()=>setShowForm(false)} submitting={submitting} />
        )}
        {showConfirmation && selectedDate && selectedSlot && (
          <ConfirmationModal date={selectedDate} slot={selectedSlot}
            consultType={lastConsultType} onClose={()=>setShowConfirmation(false)} />
        )}
      </div>
    </>
  );
}
