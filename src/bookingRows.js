// 預約的詳細資料列（預約列表與週曆共用）：[[標題, 內容], ...]

export function bookingRows(b) {
  const isChildBooking = b.consultId === "child" || b.consultTag === "親子星盤";
  const multi = b.childCount > 1;
  const who = isChildBooking ? (multi ? "孩子1 " : "孩子") : "";
  return [
    ["Line", b.line],
    ...(b.lineCode ? [["預約代碼", b.lineCode]] : []),
    ...(multi ? [["孩子人數", `${b.childCount} 位（每位各一小時，共 ${b.childCount} 小時）`]] : []),
    [`${who}性別`, b.gender],
    ...(b.childName ? [[multi ? "孩子1 稱呼" : "孩子稱呼", b.childName]] : []),
    [`${who}出生`, `${b.birthYear}/${b.birthMonth}/${b.birthDay} ${b.birthHour}:${b.birthMinute}`],
    [`${who}出生地`, b.birthPlace],
    ...(b.extraChildren || []).flatMap((c, i) => [
      [`孩子${i + 2} 稱呼`, c.childName],
      [`孩子${i + 2} 性別`, c.gender],
      [`孩子${i + 2} 出生`, `${c.birthYear}/${c.birthMonth}/${c.birthDay} ${c.birthHour}:${c.birthMinute}`],
      [`孩子${i + 2} 出生地`, c.birthPlace],
    ]),
    ...(b.momBirthYear ? [
      ["媽媽／照顧者出生", `${b.momBirthYear}/${b.momBirthMonth}/${b.momBirthDay} ${b.momBirthHour}:${b.momBirthMinute}`],
      ["媽媽／照顧者出生地", b.momBirthPlace],
    ] : []),
    ...(b.withPartner ? [
      ["合盤對象", b.partnerName || "（沒填）"],
      ["對象性別", b.partnerGender],
      ["對象出生", `${b.partnerBirthYear}/${b.partnerBirthMonth}/${b.partnerBirthDay} ${b.partnerBirthHour}:${b.partnerBirthMinute}`],
      ["對象出生地", b.partnerBirthPlace],
      ["加做合盤", `是（+$${Number(b.partnerFee || 0).toLocaleString()}）`],
    ] : []),
    ...(b.withMomChart ? [["加看媽媽本命盤", `是（+$${Number(b.momChartFee || 0).toLocaleString()}，共 ${b.sessionHours || ""} 份解讀）`]] : []),
    ...(b.withDad ? [
      ["爸爸出生", `${b.dadBirthYear}/${b.dadBirthMonth}/${b.dadBirthDay} ${b.dadBirthHour}:${b.dadBirthMinute}`],
      ["爸爸出生地", b.dadBirthPlace],
      ["加做爸爸合盤", `是（每位孩子 +$600，共 +$${Number(b.dadFee || 0).toLocaleString()}）`],
    ] : []),
    ["問題", b.question],
  ];
}
