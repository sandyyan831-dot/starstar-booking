// 組出要寫進資料庫的預約資料（純函式，不碰資料庫，方便測試）
import { discountTotal } from "./discountUtils.js";

export const MAX_CHILDREN = 3;
export const PARTNER_FEE = 600;   // 本命盤解析加做「與別人的合盤」
export const PARTNER_KEYS = { year:"partnerBirthYear", month:"partnerBirthMonth", day:"partnerBirthDay", hour:"partnerBirthHour", minute:"partnerBirthMinute", place:"partnerBirthPlace", country:"partnerOverseasCountry", region:"partnerOverseasRegion" };
export const DAD_FEE = 600;   // 加做「爸爸的親子合盤」：每位孩子加收

// 爸爸的出生資料欄位（選填加購，點開才會出現）
export const DAD_KEYS = { year:"dadBirthYear", month:"dadBirthMonth", day:"dadBirthDay", hour:"dadBirthHour", minute:"dadBirthMinute", place:"dadBirthPlace", country:"dadOverseasCountry", region:"dadOverseasRegion" };

// 第 2、3 個孩子的欄位名稱（表單與資料共用）
export const childKeys = (n) => ({
  name: `c${n}Name`, gender: `c${n}Gender`,
  year: `c${n}BirthYear`, month: `c${n}BirthMonth`, day: `c${n}BirthDay`, hour: `c${n}BirthHour`, minute: `c${n}BirthMinute`,
  place: `c${n}BirthPlace`, country: `c${n}OverseasCountry`, region: `c${n}OverseasRegion`,
});
export const emptyChildFields = () => {
  const o = {};
  for (let n = 2; n <= MAX_CHILDREN; n++) Object.values(childKeys(n)).forEach(k => { o[k] = ""; });
  return o;
};
export const clampChildCount = (v) => Math.min(MAX_CHILDREN, Math.max(1, Number(v) || 1));

const placeText = (place, country, region) =>
  place === "國外" ? `國外 — ${country}・${region}` : place;

/**
 * key：預約的時段代碼；ct：服務項目；formData：表單內容；
 * discountCode：已通過檢查的折扣碼（沒有就傳空字串）。
 */
export function buildBookingData({ key, dateLabel, timeLabel, ct, formData, discountCode = "", now = new Date() }) {
  const isChild = ct?.id === "child";
  const childCount = isChild ? clampChildCount(formData.childCount) : 1;   // 一次看幾位孩子，每位各收一次費用、各折一次
  const basePrice = (ct?.price || 0) * childCount;
  const withDad = isChild && !!formData.withDad;
  const dadFee = withDad ? DAD_FEE * childCount : 0;   // 加做爸爸合盤的加價（不打折）
  const withPartner = ct?.id === "first" && !!formData.withPartner;
  const partnerFee = withPartner ? PARTNER_FEE : 0;   // 本命盤加做合盤的加價（不打折）
  const listPrice = basePrice + dadFee + partnerFee;
  const discountAmount = discountCode && !ct?.noDiscount ? discountTotal(basePrice, childCount) : 0;

  const data = {
    slotKey: key,
    date: dateLabel,
    time: timeLabel,
    consultId: ct?.id || "",
    consultType: ct?.label || "",
    consultTag: ct?.tag || "",
    listPrice,
    discountCode: discountAmount ? discountCode : "",
    discountAmount,
    price: listPrice - discountAmount,   // 客人實際應匯的金額
    line: formData.line,
    gender: formData.gender,
    childName: (isChild || ct?.id === "textOnly") ? (formData.childName || "") : "",
    birthYear: formData.birthYear,
    birthMonth: formData.birthMonth,
    birthDay: formData.birthDay,
    birthHour: formData.birthHour,
    birthMinute: formData.birthMinute,
    birthPlace: placeText(formData.birthPlace, formData.overseasCountry, formData.overseasRegion),
    question: formData.question,
    bookedAt: now.toISOString(),
    paymentStatus: "待匯款",
  };

  if (withPartner) {
    Object.assign(data, {
      withPartner: true, partnerFee,
      partnerName: formData.partnerName || "", partnerGender: formData.partnerGender,
      partnerBirthYear: formData.partnerBirthYear, partnerBirthMonth: formData.partnerBirthMonth, partnerBirthDay: formData.partnerBirthDay,
      partnerBirthHour: formData.partnerBirthHour, partnerBirthMinute: formData.partnerBirthMinute,
      partnerBirthPlace: placeText(formData.partnerBirthPlace, formData.partnerOverseasCountry, formData.partnerOverseasRegion),
    });
  }

  // 解碼孩子的星盤天賦：加做親子合盤，需要媽媽的出生資料
  if (isChild) {
    data.childCount = childCount;
    if (withDad) {
      Object.assign(data, {
        withDad: true, dadFee,
        dadBirthYear: formData.dadBirthYear, dadBirthMonth: formData.dadBirthMonth, dadBirthDay: formData.dadBirthDay,
        dadBirthHour: formData.dadBirthHour, dadBirthMinute: formData.dadBirthMinute,
        dadBirthPlace: placeText(formData.dadBirthPlace, formData.dadOverseasCountry, formData.dadOverseasRegion),
      });
    }
    // 第 2、3 位孩子
    data.extraChildren = [];
    for (let n = 2; n <= childCount; n++) {
      const k = childKeys(n);
      data.extraChildren.push({
        childName: formData[k.name], gender: formData[k.gender],
        birthYear: formData[k.year], birthMonth: formData[k.month], birthDay: formData[k.day],
        birthHour: formData[k.hour], birthMinute: formData[k.minute],
        birthPlace: placeText(formData[k.place], formData[k.country], formData[k.region]),
      });
    }
    Object.assign(data, {
      momBirthYear: formData.momBirthYear,
      momBirthMonth: formData.momBirthMonth,
      momBirthDay: formData.momBirthDay,
      momBirthHour: formData.momBirthHour,
      momBirthMinute: formData.momBirthMinute,
      momBirthPlace: placeText(formData.momBirthPlace, formData.momOverseasCountry, formData.momOverseasRegion),
    });
  }
  return data;
}
