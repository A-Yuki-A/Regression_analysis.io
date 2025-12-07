/**********************
 * タブ切り替え処理
 **********************/
document.querySelectorAll(".tab-button").forEach(btn => {
  btn.addEventListener("click", () => {

    document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const targetId = btn.dataset.target;
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    document.getElementById(targetId).classList.add("active");
  });
});



/**********************
 * 共通：回帰計算
 **********************/
function computeRegression(x, y) {
  const n = x.length;
  if (n === 0) return null;

  let sumX = 0, sumY = 0;
  let sumXX = 0, sumYY = 0, sumXY = 0;

  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXX += x[i] * x[i];
    sumYY += y[i] * y[i];
    sumXY += x[i] * y[i];
  }

  const meanX = sumX / n;
  const meanY = sumY / n;

  const cov = sumXY / n - meanX * meanY;
  const varX = sumXX / n - meanX * meanX;
  const varY = sumYY / n - meanY * meanY;

  const r = cov / Math.sqrt(varX * varY);
  const slope = cov / varX;
  const intercept = meanY - slope * meanX;

  return { r, r2: r * r, slope, intercept };
}



/************************************************
 * 【A】アイス売上の回帰分析
 ************************************************/

let sheetIce = null;
let statsIce = {};
let chartIce = null;
let currentStatIce = null;
let currentLabelIce = "";

// 列番号（固定）
const COL_YEAR = 0;
const COL_MONTH = 1;
const COL_SALES = 2;
const COL_MEAN_TEMP = 3;
const COL_MAX_TEMP = 4;
const COL_MIN_TEMP = 5;

const X_CANDIDATES_ICE = [
  { index: COL_MEAN_TEMP, label: "日平均気温" },
  { index: COL_MAX_TEMP,  label: "最高気温（月平均）" },
  { index: COL_MIN_TEMP,  label: "最低気温（月平均）" }
];

document.getElementById("fileInputIce").addEventListener("change", loadExcelIce);
document.getElementById("calcYBtnIce").addEventListener("click", calcYFromXIce);


/**********************
 * アイス売上：Excel読み込み（ファイル名のみチェック）
 **********************/
function loadExcelIce(event) {
  const file = event.target.files[0];
  if (!file) return;

  // ▼ ファイル名チェック（これのみ厳格）
  const expectedName = "アイス売上分析.xlsx";
  if (file.name !== expectedName) {
    alert(`このファイルは使用できません。\n正しいファイル名：${expectedName}`);
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const workbook = XLSX.read(e.target.result, { type: "binary" });
    const sheetName = workbook.SheetNames[0];
    const ws = workbook.Sheets[sheetName];

    sheetIce = XLSX.utils.sheet_to_json(ws, { header: 1 });

    // 行数チェック（最低限）
    if (sheetIce.length < 2) {
      alert("このファイルにはデータがありません。");
      return;
    }

    // ▼ 型チェックは行わない（日本語Excelで型が文字扱いになるため）
    document.getElementById("statusMessageIce").textContent =
      "読み込み完了：データ行数 = " + sheetIce.length;

    computeAllStatsIce();
    renderSummaryTableIce();
    setupSelectMenuIce();  // ←これで説明変数選択が動く
  };

  reader.readAsBinaryString(file);
}



/**********************
 * アイス売上：相関・回帰計算
 **********************/
function computeAllStatsIce() {
  statsIce = {};

  X_CANDIDATES_ICE.forEach(col => {
    const x = [];
    const y = [];

    for (let i = 1; i < sheetIce.length; i++) {
      const row = sheetIce[i];
      const xv = Number(row[col.index]);
      const yv = Number(row[COL_SALES]);

      if (!isNaN(xv) && !isNaN(yv)) {
        x.push(xv);
        y.push(yv);
      }
    }

    statsIce[col.index] = computeRegression(x, y);
  });
}



/**********************
 * アイス売上：相関表表示
 **********************/
function renderSummaryTableIce() {
  const tbody = document.getElementById("resultBodyIce");
  tbody.innerHTML = "";

  X_CANDIDATES_ICE.forEach(col => {
    const s = statsIce[col.index];
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${col.label}
