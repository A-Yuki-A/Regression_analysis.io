let sheetData = null;
let statsByIndex = {};
let currentChart = null;

// Excel データ列番号
const COL_YEAR = 0;
const COL_MONTH = 1;
const COL_SALES = 2;
const COL_MEAN_TEMP = 3;
const COL_MAX_TEMP = 4;
const COL_MIN_TEMP = 5;

// 説明変数一覧
const X_CANDIDATES = [
  { index: COL_MEAN_TEMP, label: "日平均気温" },
  { index: COL_MAX_TEMP,  label: "最高気温（月平均）" },
  { index: COL_MIN_TEMP,  label: "最低気温（月平均）" }
];

document.getElementById("fileInput").addEventListener("change", loadExcel);


// =============================
// Excel 読み込み
// =============================
function loadExcel(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function(e) {
    const data = e.target.result;
    const workbook = XLSX.read(data, { type: "binary" });

    const sheet = workbook.SheetNames[0];
    const ws = workbook.Sheets[sheet];

    sheetData = XLSX.utils.sheet_to_json(ws, { header: 1 });

    document.getElementById("statusMessage").textContent =
      "読み込み完了：データ行数 = " + sheetData.length;

    computeAllStats();
    renderSummaryTable();
    setupSelectMenu();
  };

  reader.readAsBinaryString(file);
}


// =============================
// 相関・回帰の計算
// =============================
function computeAllStats() {
  statsByIndex = {};

  X_CANDIDATES.forEach(col => {
    const x = [];
    const y = [];

    for (let i = 1; i < sheetData.length; i++) {
      const row = sheetData[i];
      const xv = Number(row[col.index]);
      const yv = Number(row[COL_SALES]);

      if (!isNaN(xv) && !isNaN(yv)) {
        x.push(xv);
        y.push(yv);
      }
    }

    statsByIndex[col.index] = computeRegression(x, y);
  });
}

function computeRegression(x, y) {
  const n = x.length;

  let sumX = 0, sumY = 0, sumXX = 0, sumYY = 0, sumXY = 0;

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
  const a = cov / varX;
  const b = meanY - a * meanX;

  return { r, r2: r * r, slope: a, intercept: b };
}


// =============================
// ② 相関表の表示
// =============================
function renderSummaryTable() {
  const tbody = document.getElementById("resultBody");
  tbody.innerHTML = "";

  X_CANDIDATES.forEach(col => {
    const s = statsByIndex[col.index];
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${col.label}</td>
      <td>アイス売上</td>
      <td>${s.r.toFixed(3)}</td>
      <td>${s.r2.toFixed(3)}</td>
      <td>Y = ${s.slope.toFixed(3)}X + ${s.intercept.toFixed(3)}</td>
    `;

    tbody.appendChild(tr);
  });
}


// =============================
// プルダウン設定
// =============================
function setupSelectMenu() {
  const sel = document.getElementById("variableSelect");
  sel.innerHTML = "";

  sel.disabled = false;

  X_CANDIDATES.forEach(col => {
    const opt = document.createElement("option");
    opt.value = col.index;
    opt.textContent = col.label;
    sel.appendChild(opt);
  });

  sel.onchange = () => drawChart(Number(sel.value));
}


// =============================
// 散布図＋回帰直線
// =============================
function drawChart(colIndex) {
  const points = [];

  for (let i = 1; i < sheetData.length; i++) {
    const row = sheetData[i];

    const year  = row[COL_YEAR];
    const month = row[COL_MONTH];
    const xv = Number(row[colIndex]);
    const yv = Number(row[COL_SALES]);

    if (!isNaN(xv) && !isNaN(yv)) {
      points.push({
        x: xv,
        y: yv,
        year: year,
        month: month
      });
    }
  }

  const stat = statsByIndex[colIndex];

  const minX = Math.min(...points.map(p => p.x));
  const maxX = Math.max(...points.map(p => p.x));

  const ctx = document.getElementById("scatterChart").getContext("2d");

  if (currentChart) currentChart.destroy();

  currentChart = new Chart(ctx, {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "データ",
          data: points,
          pointRadius: 4
        },
        {
          label: "回帰直線",
          type: "line",
          borderColor: "red",
          borderWidth: 2,
          pointRadius: 0,
          data: [
            { x: minX, y: stat.slope * minX + stat.intercept },
            { x: maxX, y: stat.slope * maxX + stat.intercept }
          ]
        }
      ]
    },

    options: {
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              const p = context.raw;
              return [
                `${p.year}年 ${p.month}月`,
                `X = ${p.x}`,
                `アイス売上 = ${p.y}個`
              ];
            }
          }
        }
      }
    }
  });

  document.getElementById("regressionInfo").innerHTML =
    `<p>回帰直線：Y = ${stat.slope.toFixed(3)}X + ${stat.intercept.toFixed(3)}</p>
     <p>相関係数 r = ${stat.r.toFixed(3)}, 決定係数 R² = ${stat.r2.toFixed(3)}</p>`;
}
