import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { db } from "./firebase.js";
import { LandingTop, StartHeading, LandingBottom } from "./Landing.jsx";
import { lookupDiscountCode } from "./lookupDiscount.js";
import { DISCOUNT_AMOUNT, priceAfterDiscount } from "./discountUtils.js";
import { buildBookingData } from "./bookingData.js";
import {
  collection, doc, getDocs, writeBatch
} from "firebase/firestore";

/* ── Config ── */
const SLOT_CONFIG = {
  days: [1, 2, 3, 4, 5],
  slots: [
    { label: "上午 10:00–12:00", id: "morning" },
    { label: "下午 2:00–4:00", id: "afternoon" },
  ],
};

// 週二（getDay() === 2）上午不開放預約
function getSlotsForDate(date) {
  if (date.getDay() === 2) {
    return SLOT_CONFIG.slots.filter(s => s.id !== "morning");
  }
  return SLOT_CONFIG.slots;
}

const CONSULT_TYPES = [
  { id: "first", label: "本命盤解析", tag: "第一次諮詢", desc: "一小時", price: 3000, priceLabel: "$3,000", icon: "☽",
    reportSubtitle: "獲得個人完整報告", reportDesc: "報告內含個性特質、家庭、婚姻、事業等人生面向。",
    overtimeNote: "超過 1 小時，每半小時以 $1,500 計" },
  { id: "child", label: "解碼孩子的星盤天賦", tag: "親子星盤", desc: "一小時", price: 3600, priceLabel: "$3,600", icon: "✧",
    reportSubtitle: "獲得完整報告", reportDesc: "報告內含個性、學習天賦、手足關係與人際相處，並附親子合盤建議。",
    overtimeNote: "超過 1 小時，每半小時以 $1,500 計" },
  { id: "returning", label: "問問題 ／ 流年 ／ 合盤", tag: "已諮詢過", desc: "半小時", price: 1500, priceLabel: "$1,500", icon: "◦", quick: true,
    reportSubtitle: "適合已看過本命盤的人", reportDesc: "追問、流年、合盤，半小時就能聊。" },
  { id: "textOnly", label: "單一問題．文字回覆", tag: "文字諮詢", desc: "一次一問，純文字回覆", price: 500, priceLabel: "$500", icon: "✎", quick: true, noDiscount: true,
    reportSubtitle: "純文字回覆", reportDesc: "一次問一個問題，用文字回覆，不用通話。" },
  { id: "timing", label: "擇時", tag: "擇日擇時", desc: "半小時～一小時", price: 3600, priceLabel: "$3,600", icon: "❖",
    reportSubtitle: "選入厝時間、出生時程", reportDesc: "提供幾個時段的優缺參考" },
];

// 半小時起，需要分區時間的類型（問問題／流年、文字回覆），與本命盤解析等長時段類型分開管理，互不佔用
const QUICK_TIMES = {
  morning:   [{ id:"1000", label:"10:00–10:30" }, { id:"1030", label:"10:30–11:00" }, { id:"1100", label:"11:00–11:30" }, { id:"1130", label:"11:30–12:00" }],
  afternoon: [{ id:"1400", label:"14:00–14:30" }, { id:"1430", label:"14:30–15:00" }, { id:"1500", label:"15:00–15:30" }, { id:"1530", label:"15:30–16:00" }],
};

const TAIWAN_CITIES = [
  "台北市","新北市","基隆市","桃園市","新竹市","新竹縣",
  "苗栗縣","台中市","彰化縣","南投縣","雲林縣","嘉義市",
  "嘉義縣","台南市","高雄市","屏東縣","宜蘭縣","花蓮縣",
  "台東縣","澎湖縣","金門縣","連江縣",
];

const PAYMENT_INFO = { account: "銀行：國泰世華（013）\n帳號：034505638273" };

/* ── Helpers ── */
function getNext2MonthsDates() {
  const dates = [];
  const today = new Date(); today.setHours(0,0,0,0);
  const end = new Date(today); end.setMonth(end.getMonth() + 2);
  let d = new Date(today); d.setDate(d.getDate() + 2); // 不開放預約隔天，最早從後天開始
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
          background:"#6fa3c0", opacity:s.opacity,
          animation: `twinkle ${3+Math.random()*4}s ease-in-out ${s.delay}s infinite alternate`,
        }} />
      ))}
    </div>
  );
}

function ConstellationDeco({ style }) {
  return (
    <svg viewBox="0 0 200 200" style={{ position:"absolute", opacity:0.12, pointerEvents:"none", ...style }} xmlns="http://www.w3.org/2000/svg">
      <g stroke="#6fa3c0" strokeWidth="0.7" fill="none">
        <line x1="30" y1="40" x2="80" y2="25" /><line x1="80" y1="25" x2="120" y2="60" />
        <line x1="120" y1="60" x2="90" y2="110" /><line x1="90" y1="110" x2="140" y2="140" />
        <line x1="140" y1="140" x2="170" y2="100" /><line x1="50" y1="150" x2="90" y2="110" />
        <line x1="30" y1="40" x2="50" y2="150" />
      </g>
      <g fill="#6fa3c0">
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
        fontFamily:"'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif", fontSize:22,
        color:"#3a4f5e", marginBottom:16, letterSpacing:2, textAlign:"center", fontWeight:700,
      }}>✦ {year} 年 {month+1} 月 ✦</h3>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:4 }}>
        {dayNames.map(n => (
          <div key={n} style={{
            textAlign:"center", fontFamily:"'PingFang TC', 'Microsoft JhengHei', 'Helvetica Neue', sans-serif",
            fontSize:11, color:"#6a737c", padding:"6px 0", fontWeight:700,
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
                textAlign:"center", padding:"8px 2px", fontFamily:"'PingFang TC', 'Microsoft JhengHei', 'Helvetica Neue', sans-serif",
                fontSize:13, color:"#cdd5db", borderRadius:10, minHeight:78,
              }}><div>{day}</div></div>
            );
          }
          const daySlots = getSlotsForDate(dateObj);
          const allB = daySlots.every(slot => bookedSlots.has(dateKey(dateObj,slot.id)));
          return (
            <div key={day} style={{
              textAlign:"center", padding:"7px 3px", fontFamily:"'PingFang TC', 'Microsoft JhengHei', 'Helvetica Neue', sans-serif",
              fontSize:13, color:allB?"#c1c9d0":"#33281a",
              background:allB?"#f1eee6":"#fffaf0",
              border:`1.5px solid ${allB?"#e4e9ee":"#ece4d2"}`,
              borderRadius:12, minHeight:78, opacity:allB?0.55:1,
              display:"flex", flexDirection:"column", alignItems:"center", gap:3,
              transition:"all 0.3s",
            }}>
              <div style={{ fontWeight:700, marginBottom:2, fontSize:14 }}>{day}</div>
              {SLOT_CONFIG.slots.map(slot => {
                const short = slot.id==="morning"?"上午":"下午";
                const offered = daySlots.includes(slot);
                if (!offered) {
                  return (
                    <div key={slot.id} style={{
                      width:"92%", padding:"4px 0", borderRadius:6, fontSize:10,
                      border:"1px solid #dedede", background:"#ececec",
                      color:"#9a9a9a", fontFamily:"'PingFang TC', 'Microsoft JhengHei', 'Helvetica Neue', sans-serif",
                      fontWeight:600, letterSpacing:1,
                    }}>公休</div>
                  );
                }
                const booked = bookedSlots.has(dateKey(dateObj,slot.id));
                return (
                  <button key={slot.id} disabled={booked} onClick={()=>onSelect(dateObj,slot)}
                    style={{
                      width:"92%", padding:"4px 0", borderRadius:6, fontSize:10,
                      border:booked?"1px solid #e4e9ee":"1.5px solid #f4d675",
                      background:booked?"#eef0f3":"#fbf0c8",
                      color:booked?"#b4bec6":"#3a4f5e",
                      cursor:booked?"not-allowed":"pointer",
                      fontFamily:"'PingFang TC', 'Microsoft JhengHei', 'Helvetica Neue', sans-serif",
                      textDecoration:booked?"line-through":"none",
                      transition:"all 0.2s", fontWeight:700, letterSpacing:1,
                    }}
                    onMouseEnter={e=>{if(!booked){e.target.style.background="#f4d675";}}}
                    onMouseLeave={e=>{if(!booked){e.target.style.background="#fbf0c8";}}}
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
function BookingForm({ date, slot, bookedSlots, initialType, onSubmit, onCancel, submitting }) {
  const [consultType, setConsultType] = useState(initialType || null);
  const [quickTime, setQuickTime] = useState(null);
  const [form, setForm] = useState({
    line:"", gender:"", childName:"", birthYear:"", birthMonth:"", birthDay:"",
    birthHour:"", birthMinute:"",
    birthPlace:"", overseasCountry:"", overseasRegion:"",
    momBirthYear:"", momBirthMonth:"", momBirthDay:"", momBirthHour:"", momBirthMinute:"",
    momBirthPlace:"", momOverseasCountry:"", momOverseasRegion:"",
    question:"",
  });
  const [codeInput, setCodeInput] = useState("");
  const [discount, setDiscount] = useState({ status:"idle", code:"" }); // idle | checking | valid | invalid | unavailable
  const [errors, setErrors] = useState({});
  const update = (f,v) => { setForm(p=>({...p,[f]:v})); setErrors(e=>({...e,[f]:undefined})); };

  const selectedType = CONSULT_TYPES.find(t=>t.id===consultType);
  const isQuick = !!selectedType?.quick;
  const isChild = consultType === "child";
  const showChildName = isChild || consultType === "textOnly";
  const quickOptions = QUICK_TIMES[slot.id] || [];
  const canDiscount = !selectedType?.noDiscount;   // 單一問題（文字回覆）不能使用折扣碼
  const discountOk = canDiscount && discount.status === "valid";
  const listPrice = selectedType?.price ?? null;
  const payable = listPrice === null ? null : priceAfterDiscount(listPrice, discountOk);

  const applyCode = async () => {
    if (!codeInput.trim()) { setDiscount({ status:"idle", code:"" }); return; }
    setDiscount({ status:"checking", code:"" });
    setErrors(e=>({...e, discount:undefined}));
    const r = await lookupDiscountCode(codeInput);
    setDiscount(r.status === "valid" ? { status:"valid", code:r.code } : { status:r.status, code:"" });
  };
  const clearCode = () => { setCodeInput(""); setDiscount({ status:"idle", code:"" }); setErrors(e=>({...e, discount:undefined})); };

  const validate = () => {
    const e = {};
    if (!consultType) e.consultType="請選擇諮詢類型";
    if (isQuick && !quickTime) e.quickTime="請選擇時間";
    if (!form.line.trim()) e.line="請填寫";
    if (!form.gender) e.gender="請選擇";
    if (isChild && !form.childName.trim()) e.childName="請填寫";
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
    if (isChild) {   // 親子合盤需要媽媽（或主要照顧者）的出生資料
      ["momBirthYear","momBirthMonth","momBirthDay","momBirthHour","momBirthMinute"].forEach(k=>{ if (!form[k].trim()) e[k]="必填"; });
      if (!form.momBirthPlace) e.momBirthPlace="請選擇";
      if (form.momBirthPlace==="國外") {
        if (!form.momOverseasCountry.trim()) e.momOverseasCountry="請填寫國家";
        if (!form.momOverseasRegion.trim()) e.momOverseasRegion="請填寫地區";
      }
    }
    if (canDiscount && codeInput.trim() && !discountOk) e.discount = discount.status==="checking" ? "折扣碼檢查中，請稍候" : "請先按「套用」確認折扣碼，或清空這個欄位";
    if (!form.question.trim()) e.question="請填寫";
    setErrors(e); return Object.keys(e).length===0;
  };
  const handleSubmit = () => { if(validate() && !submitting) onSubmit({...form, consultType, quickTime: isQuick ? quickTime : null, discountCode: discountOk ? discount.code : ""}); };

  const inputBase = (field) => ({
    width:"100%", padding:"11px 14px", borderRadius:10,
    border:`1.5px solid ${errors[field]?"#d4836a":"#d5e2ec"}`,
    background:"#fffdf8", color:"#3a4f5e",
    fontFamily:"'PingFang TC', 'Microsoft JhengHei', 'Helvetica Neue', sans-serif", fontSize:14,
    outline:"none", transition:"border-color 0.3s", boxSizing:"border-box",
  });
  const lbl = { display:"block", fontFamily:"'PingFang TC', 'Microsoft JhengHei', 'Helvetica Neue', sans-serif", fontSize:13, color:"#3f6f8d", marginBottom:6, fontWeight:600 };
  const errS = { fontSize:11, color:"#d4836a", marginTop:3 };
  const focusH = e=>{ e.target.style.borderColor="#6fa3c0"; };
  const blurH = field => e=>{ e.target.style.borderColor=errors[field]?"#d4836a":"#d5e2ec"; };

  // 出生日期／時間／地點（孩子與媽媽共用；k 是欄位名稱對照，who 是標題前綴）
  const BIRTH_KEYS = {
    me:  { year:"birthYear",    month:"birthMonth",    day:"birthDay",    hour:"birthHour",    minute:"birthMinute",    place:"birthPlace",    country:"overseasCountry",    region:"overseasRegion" },
    mom: { year:"momBirthYear", month:"momBirthMonth", day:"momBirthDay", hour:"momBirthHour", minute:"momBirthMinute", place:"momBirthPlace", country:"momOverseasCountry", region:"momOverseasRegion" },
  };
  const renderBirth = (k, who) => (
    <>
      <div>
        <label style={lbl}>{who}出生日期</label>
        <div style={{ display:"grid", gridTemplateColumns:"1.3fr 0.85fr 0.85fr", gap:8 }}>
          {[[k.year,"年（如 1990）"],[k.month,"月"],[k.day,"日"]].map(([f,ph])=>(
            <div key={f}>
              <input style={{...inputBase(f), textAlign:"center"}} placeholder={ph}
                value={form[f]} onChange={e=>update(f,e.target.value)}
                onFocus={focusH} onBlur={blurH(f)} />
              {errors[f] && <div style={errS}>{errors[f]}</div>}
            </div>
          ))}
        </div>
      </div>
      <div>
        <label style={lbl}>{who}出生時間</label>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          {[[k.hour,"時（24hr）"],[k.minute,"分"]].map(([f,ph])=>(
            <div key={f}>
              <input style={{...inputBase(f), textAlign:"center"}} placeholder={ph}
                value={form[f]} onChange={e=>update(f,e.target.value)}
                onFocus={focusH} onBlur={blurH(f)} />
              {errors[f] && <div style={errS}>{errors[f]}</div>}
            </div>
          ))}
        </div>
      </div>
      <div>
        <label style={lbl}>{who}出生地</label>
        <select style={{...inputBase(k.place), appearance:"none",
          backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%23b09650' stroke-width='1.5'/%3E%3C/svg%3E")`,
          backgroundRepeat:"no-repeat", backgroundPosition:"right 12px center", paddingRight:32,
        }}
          value={form[k.place]} onChange={e=>update(k.place,e.target.value)}
          onFocus={focusH} onBlur={blurH(k.place)}
        >
          <option value="">請選擇出生地</option>
          {TAIWAN_CITIES.map(c=><option key={c} value={c}>{c}</option>)}
          <option value="國外">國外</option>
        </select>
        {errors[k.place] && <div style={errS}>{errors[k.place]}</div>}
        {form[k.place]==="國外" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:10 }}>
            <div>
              <input style={inputBase(k.country)} placeholder="國家"
                value={form[k.country]} onChange={e=>update(k.country,e.target.value)}
                onFocus={focusH} onBlur={blurH(k.country)} />
              {errors[k.country] && <div style={errS}>{errors[k.country]}</div>}
            </div>
            <div>
              <input style={inputBase(k.region)} placeholder="地區／城市"
                value={form[k.region]} onChange={e=>update(k.region,e.target.value)}
                onFocus={focusH} onBlur={blurH(k.region)} />
              {errors[k.region] && <div style={errS}>{errors[k.region]}</div>}
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(245,240,232,0.85)",
      backdropFilter:"blur(12px)", display:"flex", alignItems:"center",
      justifyContent:"center", zIndex:1000, padding:16,
    }}>
      <div style={{
        background:"linear-gradient(170deg, #fefcf7 0%, #f8f3ea 100%)",
        border:"1.5px solid #d5e2ec", borderRadius:20,
        padding:"28px 24px", maxWidth:520, width:"100%",
        maxHeight:"92vh", overflowY:"auto", position:"relative",
        boxShadow:"0 8px 40px rgba(160,140,100,0.12)",
      }}>
        <button onClick={onCancel} style={{
          position:"absolute", top:14, right:16, background:"none",
          border:"none", color:"#6a737c", fontSize:20, cursor:"pointer",
        }}>✕</button>

        <h2 style={{
          fontFamily:"Georgia, 'Times New Roman', serif", fontSize:24,
          color:"#3f6f8d", marginBottom:4, fontWeight:600,
        }}>預約占星諮詢</h2>
        <p style={{
          fontFamily:"'PingFang TC', 'Microsoft JhengHei', 'Helvetica Neue', sans-serif", fontSize:13,
          color:"#6a737c", marginBottom:22,
        }}>{formatDate(date)}　{slot.label}</p>

        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* Consult Type */}
          <div>
            <label style={lbl}>諮詢類型 <span style={{color:"#d4836a"}}>*</span></label>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {CONSULT_TYPES.map(t => {
                const sel = consultType===t.id;
                return (
                  <button key={t.id} onClick={()=>{setConsultType(t.id);setQuickTime(null);setErrors(e=>({...e,consultType:undefined,quickTime:undefined}));}}
                    style={{
                      textAlign:"left", padding:"14px 16px", borderRadius:12,
                      border:`2px solid ${sel?"#3a4f5e":"#e4e9ee"}`,
                      background:sel?"#e6eff5":"#ffffff",
                      cursor:"pointer", transition:"all 0.25s",
                    }}
                    onMouseEnter={e=>{if(!sel)e.currentTarget.style.borderColor="#bccbd8";}}
                    onMouseLeave={e=>{if(!sel)e.currentTarget.style.borderColor="#e4e9ee";}}
                  >
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                      <span style={{ fontSize:16, color:"#6fa3c0" }}>{t.icon}</span>
                      <span style={{
                        fontFamily:"'PingFang TC', 'Microsoft JhengHei', 'Helvetica Neue', sans-serif", fontSize:14,
                        color:sel?"#3a4f5e":"#4a5560", fontWeight:700,
                      }}>{t.label}</span>
                      <span style={{
                        fontSize:10, color:"#6a737c", background:"rgba(176,150,80,0.1)",
                        padding:"2px 8px", borderRadius:4, fontFamily:"'PingFang TC', 'Microsoft JhengHei', 'Helvetica Neue', sans-serif",
                      }}>{t.tag}</span>
                    </div>
                    <div style={{
                      fontFamily:"'PingFang TC', 'Microsoft JhengHei', 'Helvetica Neue', sans-serif", fontSize:12,
                      color:"#6a737c", paddingLeft:24,
                    }}>{t.desc}　｜　費用 {t.priceLabel}</div>
                    {t.reportSubtitle && (
                      <div style={{
                        fontFamily:"'PingFang TC', 'Microsoft JhengHei', 'Helvetica Neue', sans-serif",
                        paddingLeft:24, marginTop:6,
                      }}>
                        <div style={{ fontSize:12, color:"#3f6f8d", fontWeight:700, marginBottom:2 }}>{t.reportSubtitle}</div>
                        <div style={{ fontSize:11.5, color:"#6a737c", lineHeight:1.6 }}>{t.reportDesc}</div>
                      </div>
                    )}
                    {t.overtimeNote && (
                      <div style={{
                        fontFamily:"'PingFang TC', 'Microsoft JhengHei', 'Helvetica Neue', sans-serif", fontSize:11,
                        color:"#8a949c", paddingLeft:24, marginTop:6, fontStyle:"italic",
                      }}>⏱ {t.overtimeNote}</div>
                    )}
                  </button>
                );
              })}
            </div>
            {errors.consultType && <div style={errS}>{errors.consultType}</div>}
          </div>

          {/* Quick time picker — only for half-hour types */}
          {isQuick && (
            <div>
              <label style={lbl}>選擇時間 <span style={{color:"#d4836a"}}>*</span></label>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(2, 1fr)", gap:8 }}>
                {quickOptions.map(qt => {
                  const key = dateKey(date, qt.id);
                  const booked = bookedSlots?.has(key);
                  const sel = quickTime === qt.id;
                  return (
                    <button key={qt.id} disabled={booked}
                      onClick={()=>{setQuickTime(qt.id);setErrors(e=>({...e,quickTime:undefined}));}}
                      style={{
                        padding:"10px 0", borderRadius:10, fontSize:13,
                        border:`1.5px solid ${booked?"#e4e9ee":sel?"#6fa3c0":"#d5e2ec"}`,
                        background:booked?"#eef0f3":sel?"linear-gradient(135deg, #eef5fa, #e6eff5)":"#fdfaf3",
                        color:booked?"#b4bec6":sel?"#3a4f5e":"#4a5560",
                        cursor:booked?"not-allowed":"pointer",
                        fontFamily:"'PingFang TC', 'Microsoft JhengHei', 'Helvetica Neue', sans-serif",
                        textDecoration:booked?"line-through":"none",
                        fontWeight:600, transition:"all 0.2s",
                      }}
                    >{booked?`${qt.label}（已約）`:qt.label}</button>
                  );
                })}
              </div>
              {errors.quickTime && <div style={errS}>{errors.quickTime}</div>}
            </div>
          )}

          {/* Line */}
          <div>
            <label style={lbl}>Line 顯示名稱</label>
            <input style={inputBase("line")} placeholder="請輸入您的 Line 顯示名稱"
              value={form.line} onChange={e=>update("line",e.target.value)}
              onFocus={focusH} onBlur={blurH("line")} />
            {errors.line && <div style={errS}>{errors.line}</div>}
          </div>

          {/* Gender */}
          <div>
            <label style={lbl}>{isChild ? "孩子的性別" : "性別"} <span style={{color:"#d4836a"}}>*</span></label>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {["男","女"].map(g => {
                const sel = form.gender===g;
                return (
                  <button key={g} onClick={()=>update("gender",g)}
                    style={{
                      padding:"11px 0", borderRadius:10, fontSize:14,
                      border:`1.5px solid ${sel?"#6fa3c0":"#d5e2ec"}`,
                      background:sel?"linear-gradient(135deg, #eef5fa, #e6eff5)":"#fffdf8",
                      color:sel?"#3a4f5e":"#4a5560",
                      cursor:"pointer", fontFamily:"'PingFang TC', 'Microsoft JhengHei', 'Helvetica Neue', sans-serif",
                      fontWeight:600, transition:"all 0.2s",
                    }}
                  >{g}</button>
                );
              })}
            </div>
            {errors.gender && <div style={errS}>{errors.gender}</div>}
          </div>

          {/* Child name — 解碼孩子的星盤天賦（必填）／ 單一問題文字回覆（選填，因為也常問孩子的事） */}
          {showChildName && (
            <div>
              <label style={lbl}>孩子怎麼稱呼{isChild && <span style={{color:"#d4836a"}}> *</span>}</label>
              <input style={inputBase("childName")} placeholder={isChild ? "請輸入孩子的稱呼" : "若與孩子有關，請輸入孩子的稱呼（選填）"}
                value={form.childName} onChange={e=>update("childName",e.target.value)}
                onFocus={focusH} onBlur={blurH("childName")} />
              {errors.childName && <div style={errS}>{errors.childName}</div>}
            </div>
          )}

          {/* 出生資料（解碼孩子：這一組是「孩子的」） */}
          {renderBirth(BIRTH_KEYS.me, isChild ? "孩子的" : "")}

          {/* 媽媽的出生資料：解碼孩子的星盤天賦會加做親子合盤 */}
          {isChild && (
            <div style={{ borderTop:"1.5px dashed #c9d8ea", paddingTop:16, display:"flex", flexDirection:"column", gap:16 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:"#3a4f5e", marginBottom:2 }}>媽媽（或主要照顧者）的出生資料 <span style={{color:"#d4836a"}}>*</span></div>
                <div style={{ fontSize:12, color:"#6a737c", lineHeight:1.6 }}>報告會加入「親子合盤」的建議，所以需要媽媽（或主要照顧者）的出生資料。</div>
              </div>
              {renderBirth(BIRTH_KEYS.mom, "媽媽（或主要照顧者）的")}
            </div>
          )}

          {/* Question */}
          <div>
            <label style={lbl}>想要問的問題</label>
            {consultType==="returning" && (
              <div style={{ fontSize:11.5, color:"#6a737c", lineHeight:1.6, marginBottom:6, fontFamily:"'PingFang TC', 'Microsoft JhengHei', 'Helvetica Neue', sans-serif" }}>
                若要合盤，請附上對方的性別、出生年月日時與出生地
              </div>
            )}
            <textarea style={{...inputBase("question"), minHeight:80, resize:"vertical"}}
              placeholder="請描述您想諮詢的問題方向…"
              value={form.question} onChange={e=>update("question",e.target.value)}
              onFocus={focusH} onBlur={blurH("question")} />
            {errors.question && <div style={errS}>{errors.question}</div>}
          </div>

          {/* 折扣碼（單一問題不適用） */}
          {canDiscount && <div>
            <label style={lbl}>折扣碼（選填）</label>
            <div style={{ display:"flex", gap:8 }}>
              <input style={{...inputBase("discount"), flex:1, textTransform:"uppercase", letterSpacing:1}} placeholder="有折扣碼的話請輸入"
                value={codeInput} disabled={discountOk}
                onChange={e=>{ setCodeInput(e.target.value); if (discount.status!=="idle") setDiscount({ status:"idle", code:"" }); setErrors(er=>({...er, discount:undefined})); }}
                onFocus={focusH} onBlur={blurH("discount")} />
              {discountOk ? (
                <button onClick={clearCode} style={{ flexShrink:0, padding:"0 16px", borderRadius:10, border:"1.5px solid #3a4f5e", background:"transparent", color:"#3a4f5e", fontSize:14, fontWeight:700, cursor:"pointer" }}>移除</button>
              ) : (
                <button onClick={applyCode} disabled={discount.status==="checking" || !codeInput.trim()} style={{
                  flexShrink:0, padding:"0 18px", borderRadius:10, border:"none", background:"#f4d675", color:"#3a4f5e",
                  fontSize:14, fontWeight:700, cursor:(discount.status==="checking"||!codeInput.trim())?"not-allowed":"pointer", opacity:!codeInput.trim()?0.55:1,
                }}>{discount.status==="checking" ? "檢查中…" : "套用"}</button>
              )}
            </div>
            {discountOk && <div style={{ fontSize:12.5, color:"#2f6f4a", marginTop:5, fontWeight:700 }}>✓ 已套用折扣碼，折抵 ${DISCOUNT_AMOUNT}</div>}
            {discount.status==="invalid" && <div style={errS}>這組折扣碼無效，請確認後再輸入</div>}
            {discount.status==="unavailable" && <div style={errS}>目前無法驗證折扣碼，你可以先清空這個欄位完成預約，之後再用 LINE 告訴我</div>}
            {errors.discount && <div style={errS}>{errors.discount}</div>}
          </div>}

          {/* 金額摘要 */}
          {payable !== null && (
            <div style={{ background:"#eef5fa", border:"1.5px solid #d5e2ec", borderRadius:14, padding:"12px 16px", fontSize:14, color:"#3a4f5e" }}>
              <div style={{ display:"flex", justifyContent:"space-between" }}><span>諮詢費用</span><span>${listPrice.toLocaleString()}</span></div>
              {discountOk && <div style={{ display:"flex", justifyContent:"space-between", color:"#2f6f4a" }}><span>折扣碼</span><span>−${DISCOUNT_AMOUNT}</span></div>}
              <div style={{ display:"flex", justifyContent:"space-between", fontWeight:700, fontSize:16, marginTop:6, paddingTop:6, borderTop:"1px dashed #b7c4d6" }}><span>應匯金額</span><span>${payable.toLocaleString()}</span></div>
            </div>
          )}

          <button onClick={handleSubmit} disabled={submitting} style={{
            width:"100%", padding:"14px 0", borderRadius:12, border:"none",
            background: submitting ? "#ccc" : "#f4d675",
            color:"#3a4f5e", fontFamily:"'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif",
            fontSize:16, fontWeight:700, cursor:submitting?"wait":"pointer", letterSpacing:3,
            marginTop:4, transition:"all 0.15s",
            boxShadow:submitting?"none":"0 4px 0 #d9b84f",
          }}
            onMouseEnter={e=>{if(!submitting){e.currentTarget.style.transform="translateY(-1px)";}}}
            onMouseLeave={e=>{if(!submitting){e.currentTarget.style.transform="translateY(0)";}}}
          >{submitting ? "預約中…" : "確認預約"}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Confirmation ── */
function ConfirmationModal({ date, timeLabel, consultType, pay, onClose }) {
  const ct = CONSULT_TYPES.find(t=>t.id===consultType);
  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(245,240,232,0.85)",
      backdropFilter:"blur(12px)", display:"flex", alignItems:"center",
      justifyContent:"center", zIndex:1000, padding:16,
    }}>
      <div style={{
        background:"linear-gradient(170deg, #fefcf7 0%, #f8f3ea 100%)",
        border:"1.5px solid #d5e2ec", borderRadius:20,
        padding:"32px 24px", maxWidth:480, width:"100%", textAlign:"center",
        boxShadow:"0 8px 40px rgba(160,140,100,0.12)",
      }}>
        <div style={{ fontSize:36, marginBottom:10, color:"#6fa3c0" }}>✧</div>
        <h2 style={{
          fontFamily:"Georgia, 'Times New Roman', serif", fontSize:24,
          color:"#3f6f8d", marginBottom:6,
        }}>預約已送出</h2>
        <p style={{
          fontFamily:"'PingFang TC', 'Microsoft JhengHei', 'Helvetica Neue', sans-serif", fontSize:13,
          color:"#6a737c", marginBottom:4, lineHeight:1.7,
        }}>{formatDate(date)}　{timeLabel}</p>
        <p style={{
          fontFamily:"'PingFang TC', 'Microsoft JhengHei', 'Helvetica Neue', sans-serif", fontSize:13,
          color:"#3f6f8d", marginBottom:22, fontWeight:600,
        }}>{ct?.icon} {ct?.label}</p>

        <div style={{
          background:"linear-gradient(135deg, #eef5fa, #e6eff5)",
          border:"1.5px solid #d5e2ec", borderRadius:14,
          padding:"18px 22px", marginBottom:22, textAlign:"left",
        }}>
          <p style={{
            fontFamily:"'PingFang TC', 'Microsoft JhengHei', 'Helvetica Neue', sans-serif", fontSize:14,
            color:"#3f6f8d", fontWeight:700, marginBottom:10,
          }}>✦ 匯款資訊</p>
          <p style={{
            fontFamily:"'PingFang TC', 'Microsoft JhengHei', 'Helvetica Neue', sans-serif", fontSize:13,
            color:"#7a6a4a", whiteSpace:"pre-line", lineHeight:1.9, marginBottom:10,
          }}>{PAYMENT_INFO.account}</p>
          <p style={{
            fontFamily:"'PingFang TC', 'Microsoft JhengHei', 'Helvetica Neue', sans-serif", fontSize:16,
            color:"#3a4f5e", fontWeight:700,
          }}>應匯金額：{pay ? `$${pay.price.toLocaleString()}` : ct?.priceLabel}</p>
          {pay?.discount > 0 && (
            <p style={{
              fontFamily:"'PingFang TC', 'Microsoft JhengHei', 'Helvetica Neue', sans-serif", fontSize:12.5,
              color:"#2f6f4a", marginTop:4,
            }}>已套用折扣碼，折抵 ${pay.discount}</p>
          )}
        </div>

        <p style={{
          fontFamily:"'PingFang TC', 'Microsoft JhengHei', 'Helvetica Neue', sans-serif", fontSize:12,
          color:"#6a737c", lineHeight:1.9, marginBottom:16,
        }}>
          請於預約後 <strong style={{color:"#3f6f8d"}}>3 天內</strong> 完成匯款<br/>
          匯款完成後請點下方按鈕，透過 Line 傳送匯款截圖<br/>
          請使用與預約表單<strong style={{color:"#3f6f8d"}}>相同的 Line 顯示名稱</strong>傳送<br/>
          確認收款後才算正式完成預約 ✧
        </p>

        <a href="https://line.me/R/ti/p/@754atiwp" target="_blank" rel="noopener noreferrer" style={{
          display:"block", width:"100%", padding:"13px 0", borderRadius:10, border:"none",
          background:"linear-gradient(135deg, #06C755, #05a648)",
          color:"#fff", fontFamily:"'PingFang TC', 'Microsoft JhengHei', 'Helvetica Neue', sans-serif",
          fontSize:15, fontWeight:700, cursor:"pointer", letterSpacing:2,
          textAlign:"center", textDecoration:"none", marginBottom:12,
          boxShadow:"0 2px 10px rgba(6,199,85,0.25)",
        }}>💬 開啟 Line 傳送匯款截圖</a>

        <button onClick={onClose} style={{
          width:"100%", padding:"11px 0", borderRadius:10,
          border:"1.5px solid #bccbd8", background:"transparent",
          color:"#3f6f8d", fontFamily:"'PingFang TC', 'Microsoft JhengHei', 'Helvetica Neue', sans-serif",
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
  const [lastTimeLabel, setLastTimeLabel] = useState(null);
  const [lastPay, setLastPay] = useState(null);
  const [pickedType, setPickedType] = useState(null);
  const calendarRef = useRef(null);
  const [loading, setLoading] = useState(false);
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

  /* Load booked + blocked slots from Firestore（只讀公開的時段，不讀客人個資） */
  useEffect(() => {
    (async () => {
      // 三個來源各自讀取：bookedSlots／blockedSlots 是公開時段；
      // bookings 只在資料庫權限收緊前讀得到（過渡期用），之後會被拒絕，屬正常情況
      const slots = new Set();
      const results = await Promise.allSettled(
        ["bookedSlots", "blockedSlots", "bookings"].map(c => getDocs(collection(db, c)))
      );
      results.forEach(r => {
        if (r.status === "fulfilled") r.value.forEach(doc => slots.add(doc.id));
      });
      if (results[0].status === "rejected" && results[2].status === "rejected") {
        console.error("Failed to load booked slots:", results[0].reason);
      }
      setBookedSlots(slots);
    })();
  }, []);

  // 點首頁上方的服務項目：記住選擇並捲動到月曆，點日期時段後表單會直接帶入該項目
  const pickType = (id) => {
    setPickedType(id);
    setTimeout(() => calendarRef.current?.scrollIntoView({ behavior:"smooth", block:"start" }), 0);
  };

  const handleSelect = (date, slot) => {
    setSelectedDate(date); setSelectedSlot(slot); setShowForm(true);
  };

  const handleSubmit = async (formData) => {
    setSubmitting(true);
    const ct = CONSULT_TYPES.find(t => t.id === formData.consultType);
    const quickOpt = ct?.quick ? (QUICK_TIMES[selectedSlot.id] || []).find(q => q.id === formData.quickTime) : null;
    const key = quickOpt ? dateKey(selectedDate, quickOpt.id) : dateKey(selectedDate, selectedSlot.id);
    const timeLabel = quickOpt ? quickOpt.label : selectedSlot.label;

    const bookingData = buildBookingData({
      key, dateLabel: formatDate(selectedDate), timeLabel, ct, formData,
      discountCode: formData.discountCode || "",
    });

    try {
      // 客人資料寫進 bookings（只有後台看得到），時段另外寫進公開的 bookedSlots
      const batch = writeBatch(db);
      batch.set(doc(db, "bookings", key), bookingData);
      batch.set(doc(db, "bookedSlots", key), { bookedAt: bookingData.bookedAt });
      await batch.commit();
      const nb = new Set(bookedSlots);
      nb.add(key);
      setBookedSlots(nb);
      setLastConsultType(formData.consultType);
      setLastTimeLabel(timeLabel);
      setLastPay({ price: bookingData.price, discount: bookingData.discountAmount });
      setShowForm(false);
      setPickedType(null);
      setShowConfirmation(true);
    } catch (e) {
      console.error("Booking failed:", e);
      alert(e?.code === "permission-denied"
        ? "這個時段剛剛被預約了，請重新選擇其他時段。"
        : "預約失敗，請稍後再試。");
    }
    setSubmitting(false);
  };

  return (
    <>
      <style>{`
        * { margin:0; padding:0; box-sizing:border-box; }
        body { background:#faf7f0; }
        ::-webkit-scrollbar { width:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#d5e2ec; border-radius:3px; }
      `}</style>

      <div style={{
        minHeight:"100vh",
        background:"#faf7f0",
        color:"#3a4f5e", padding:"0 0 50px 0", position:"relative", overflow:"hidden",
      }}>
        <LandingTop onPick={pickType} />
        <StartHeading />

        {/* Info pills */}
        <div style={{ maxWidth:680, margin:"20px auto 14px", padding:"0 20px" }}>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8, justifyContent:"flex-start" }}>
            {[
              "每週一至五（週二上午除外）",
              "上午 10–12 ／ 下午 2–4",
              "諮詢費 $1,500 ／半小時",
            ].map((text,i)=>(
              <div key={i} style={{
                background:"#e6eff5", borderRadius:12, padding:"6px 13px",
                fontFamily:"'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif", fontSize:12.5,
                color:"#3a4f5e", fontWeight:700,
              }}>✦ {text}</div>
            ))}
          </div>
        </div>

        {/* Consult type cards */}
        <div style={{ maxWidth:680, margin:"0 auto 36px", padding:"0 20px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(230px, 1fr))", gridAutoRows:"1fr", gap:12 }}>
            {CONSULT_TYPES.map(t=>{
              const on = pickedType===t.id;
              return (
              <div key={t.id} role="button" tabIndex={0}
                onClick={()=>pickType(t.id)}
                onKeyDown={e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); pickType(t.id); } }}
                style={{
                background:on?"#e6eff5":"#ffffff",
                border:`1.5px solid ${on?"#3a4f5e":"#ece4d2"}`, borderRadius:20, padding:"14px 18px",
                boxShadow:on?"0 0 0 1.5px #3a4f5e":"none",
                position:"relative", cursor:"pointer", transition:"all 0.18s",
                fontFamily:"'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif",
              }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                  <span style={{
                    flexShrink:0, width:30, height:30, borderRadius:10, background:"#f4d675", color:"#3a4f5e",
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700,
                  }}>{t.icon}</span>
                  <span style={{ fontSize:16, color:"#3a4f5e", fontWeight:700, lineHeight:1.4 }}>{t.label}</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", fontSize:13, color:"#6a737c" }}>
                  <span>{t.desc}</span>
                  <span style={{ background:"#f4d675", color:"#3a4f5e", fontWeight:700, borderRadius:8, padding:"1px 10px", fontSize:14 }}>{t.priceLabel}</span>
                </div>
                {t.reportSubtitle && (
                  <div style={{ marginTop:10, paddingTop:10, borderTop:"1.5px dashed #d3e1ec" }}>
                    <div style={{ fontSize:13, color:"#3f6f8d", fontWeight:700, marginBottom:2 }}>{t.reportSubtitle}</div>
                    <div style={{ fontSize:12.5, color:"#6a737c", lineHeight:1.7 }}>{t.reportDesc}</div>
                  </div>
                )}
                {t.overtimeNote && (
                  <div style={{ fontSize:12, color:"#6a737c", marginTop:8 }}>⏱ {t.overtimeNote}</div>
                )}
              </div>
              );
            })}
          </div>
        </div>

        {/* Calendar */}
        <div ref={calendarRef} style={{ maxWidth:680, margin:"0 auto", padding:"0 16px", position:"relative", scrollMarginTop:8 }}>
          {pickedType && (() => {
            const pt = CONSULT_TYPES.find(t=>t.id===pickedType);
            return (
              <div style={{
                position:"sticky", top:8, zIndex:20, marginBottom:16,
                display:"flex", alignItems:"center", justifyContent:"space-between", gap:10,
                background:"#e6eff5",
                border:"1.5px solid #3a4f5e", borderRadius:20, padding:"10px 16px",
                fontFamily:"'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif",
                boxShadow:"none",
              }}>
                <div style={{ fontSize:14, color:"#3a4f5e", fontWeight:700, lineHeight:1.5 }}>
                  {pt?.icon} {pt?.label}
                  <div style={{ fontSize:12, color:"#6a737c", fontWeight:500 }}>請點選下方日期時段預約</div>
                </div>
                <button onClick={()=>setPickedType(null)} style={{
                  flexShrink:0, padding:"5px 12px", borderRadius:8, border:"1.5px solid #3a4f5e",
                  background:"transparent", color:"#3a4f5e", fontSize:12.5, cursor:"pointer", fontWeight:700,
                }}>取消</button>
              </div>
            );
          })()}
          {loading ? (
            <div style={{ textAlign:"center", padding:50, fontFamily:"'PingFang TC', 'Microsoft JhengHei', 'Helvetica Neue', sans-serif", color:"#8a949c" }}>載入中…</div>
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
          fontFamily:"'PingFang TC', 'Microsoft JhengHei', 'Helvetica Neue', sans-serif", fontSize:11,
          color:"#6a737c", letterSpacing:2,
        }}>✧ 點選日期時段即可開始預約 ✧</div>

        <LandingBottom onPick={pickType} />

        <div style={{
          position:"absolute", bottom:0, left:0, right:0, height:1,
          background:"linear-gradient(90deg, transparent 10%, #f4d675 40%, #f4d675 50%, #f4d675 60%, transparent 90%)",
          opacity:0.3,
        }} />

        {showForm && selectedDate && selectedSlot && (
          <BookingForm date={selectedDate} slot={selectedSlot} bookedSlots={bookedSlots} initialType={pickedType}
            onSubmit={handleSubmit} onCancel={()=>setShowForm(false)} submitting={submitting} />
        )}
        {showConfirmation && selectedDate && selectedSlot && (
          <ConfirmationModal date={selectedDate} timeLabel={lastTimeLabel}
            consultType={lastConsultType} pay={lastPay} onClose={()=>setShowConfirmation(false)} />
        )}
      </div>
    </>
  );
}
