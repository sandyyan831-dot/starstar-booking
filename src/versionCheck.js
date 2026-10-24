// 後台開著很久（例如手機上一直沒關）時，網站更新了也不會自己換新版。
// 這裡偶爾去看一下網站上最新的程式檔名，跟目前開著的不一樣就回報「有新版本」。
import { useEffect, useState } from "react";

const ASSET = /\/assets\/index-[\w-]+\.js/;

const currentAsset = () => {
  const s = [...document.querySelectorAll("script[src]")].find(el => ASSET.test(el.src));
  return s ? s.src.match(ASSET)[0] : null;   // 開發模式（npm run dev）沒有這個檔，就不檢查
};

async function latestAsset() {
  const res = await fetch(`/?v=${Date.now()}`, { cache: "no-store" });
  const html = await res.text();
  const m = html.match(ASSET);
  return m ? m[0] : null;
}

export function useNewVersion() {
  const [hasNew, setHasNew] = useState(false);
  useEffect(() => {
    const mine = currentAsset();
    if (!mine) return;
    const check = async () => {
      try {
        const latest = await latestAsset();
        if (latest && latest !== mine) setHasNew(true);
      } catch { /* 沒網路就下次再看 */ }
    };
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    check();
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(check, 10 * 60 * 1000);
    return () => { document.removeEventListener("visibilitychange", onVisible); clearInterval(timer); };
  }, []);
  return hasNew;
}
