// LINE 沒有自動傳出去時（或想手動傳），顯示要傳給客人的訊息，可以選取或按按鈕複製
import { useState } from "react";

const font = "'PingFang TC', 'Microsoft JhengHei', 'Helvetica Neue', sans-serif";

async function copyText(text, textarea) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 有些瀏覽器不給用 clipboard，改用舊方法：選取文字框再複製；還是不行就留著選取狀態讓人按 ⌘C
    textarea.focus();
    textarea.setSelectionRange(0, text.length);
    try { return document.execCommand("copy"); } catch { return false; }
  }
}

export default function LineMessageModal({ booking, text, error, onClose }) {
  const [copied, setCopied] = useState(null);   // null：還沒按；true：已複製；false：瀏覽器擋住了
  let textarea;
  return (
    <div onClick={onClose} style={{
      position:"fixed", inset:0, background:"rgba(60,50,30,0.35)", zIndex:1000,
      display:"flex", alignItems:"center", justifyContent:"center", padding:16, fontFamily:font,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background:"#fefcf7", borderRadius:14, padding:"20px 18px", width:"100%", maxWidth:420,
        boxShadow:"0 8px 30px rgba(0,0,0,0.15)",
      }}>
        <div style={{ fontSize:15, fontWeight:700, color:"#6b5c3e", marginBottom:6 }}>📩 傳給 {booking.line || "客人"} 的 LINE 訊息</div>
        {error && (
          <div style={{ fontSize:12, color:"#c0392b", background:"#fdf0ee", border:"1px solid #f0c4bc", borderRadius:8, padding:"6px 10px", marginBottom:10, lineHeight:1.6 }}>
            沒有自動傳出去：{error}<br/>請複製下面的訊息，到 LINE 貼上傳給客人。
          </div>
        )}
        <textarea ref={el => { textarea = el; }} readOnly value={text} rows={4}
          onFocus={e => e.target.select()}
          style={{
            width:"100%", boxSizing:"border-box", fontSize:14, lineHeight:1.7, color:"#3a4f5e",
            border:"1px solid #e5ddd0", borderRadius:8, padding:"8px 10px", resize:"none",
            fontFamily:font, background:"#fff", userSelect:"text", WebkitUserSelect:"text",
          }} />
        {copied === false && (
          <div style={{ fontSize:12, color:"#b07a2a", marginTop:6 }}>瀏覽器不讓自動複製，文字已經選好了，請按 ⌘C（Windows 按 Ctrl+C）複製</div>
        )}
        <div style={{ display:"flex", gap:8, marginTop:12 }}>
          <button onClick={async () => setCopied(await copyText(text, textarea))} style={{
            flex:1, padding:"10px 0", borderRadius:8, border:"none",
            background:copied ? "#6a9a5b" : "linear-gradient(135deg, #06C755, #05a648)",
            color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:font,
          }}>{copied ? "✓ 已複製，去 LINE 貼上" : "📋 複製訊息"}</button>
          <button onClick={onClose} style={{
            padding:"10px 16px", borderRadius:8, border:"1px solid #cbba95", background:"transparent",
            color:"#8a7340", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:font,
          }}>關閉</button>
        </div>
      </div>
    </div>
  );
}
