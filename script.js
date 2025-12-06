/**********************
 * 共通：回帰計算
 **********************/
function computeRegression(x, y) {
  const n = x.length;
  if (n === 0) return null;

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

/************************************************
 * 【A】アイス売上の回帰分析
 ************************************************/
let sheetIce = null;
let statsIce = {};
let chartIce = null;
let currentStatIce = null;

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

function loadExcelIce(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function(e) {
    const data = e.target.result;
    const workbook = XLSX.read(data, { type: "binary" });

    const sheet = workbook.SheetNames[0];
    const ws = workbook.Sheets[sheet];

    sheetIce = XLSX.utils.sheet_to_json(ws, { header: 1 });

    document.getElementById("statusMessageIce").textContent =
      "読み込み完了：データ行数 = " + sheetIce.length;

    computeAllStatsIce();
    renderSummaryTableIce();
    setupSelectMenuIce();
  };

  reader.readAsBinaryString(file);
}

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

function renderSummaryTableIce() {
  const tbody = document.getElementById("resultBodyIce");
  tbody.innerHTML = "";

  X_CANDIDATES_ICE.forEach(col => {
    const s = statsIce[col.index];
    if (!s) return;

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

function setupSelectMenuIce() {
  const sel = document.getElementById("variableSelectIce");
  sel.innerHTML = "";
  sel.disabled = false;

  X_CANDIDATES_ICE.forEach(col => {
    const opt = document.createElement("option");
    opt.value = col.index;
    opt.textContent = col.label;
    sel.appendChild(opt);
  });

  sel.onchange = () => drawChartIce(Number(sel.value));
}

function drawChartIce(colIndex) {
  const points = [];
  for (let i = 1; i < sheetIce.length; i++) {
    const row = sheetIce[i];

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

  const stat = statsIce[colIndex];
  currentStatIce = stat;
  const xLabel = getLabelByIndexIce(colIndex);

  const minX = Math.min(...points.map(p => p.x));
  const maxX = Math.max(...points.map(p => p.x));

  const ctx = document.getElementById("scatterChartIce").getContext("2d");
  if (chartIce) chartIce.destroy();

  chartIce = new Chart(ctx, {
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

  document.getElementById("regressionInfoIce").innerHTML =
    `<p>説明変数：${xLabel}</p>
     <p>回帰直線：Y = ${stat.slope.toFixed(3)}X + ${stat.intercept.toFixed(3)}</p>
     <p>相関係数 r = ${stat.r.toFixed(3)}, 決定係数 R² = ${stat.r2.toFixed(3)}</p>`;

  document.getElementById("xLabelSpanIce").textContent = xLabel;
  document.getElementById("inputXIce").value = "";
  document.getElementById("outputYIce").textContent = "";
}

function getLabelByIndexIce(idx) {
  const found = X_CANDIDATES_ICE.find(c => c.index === idx);
  return found ? found.label : "X";
}

function calcYFromXIce() {
  const output = document.getElementById("outputYIce");

  if (!currentStatIce) {
    output.textContent = " 先に説明変数を選んでください。";
    return;
  }

  const xStr = document.getElementById("inputXIce").value;
  const x = Number(xStr);

  if (xStr === "" || isNaN(x)) {
    output.textContent = " 数値を入力してください。";
    return;
  }

  const y = currentStatIce.slope * x + currentStatIce.intercept;
  output.textContent = `→ 予測 Y（アイス売上） ≒ ${y.toFixed(1)} 個`;
}

/************************************************
 * 【B】Jリーグ分析の回帰分析
 ************************************************/
let sheetJ = null;
let chartJ = null;
let currentStatJ = null;
let currentXLabelJ = "";
let currentYLabelJ = "";
let headersJ = [];

document.getElementById("fileInputJ").addEventListener("change", loadExcelJ);
document.getElementById("calcYBtnJ").addEventListener("click", calcYFromXJ);

function loadExcelJ(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function(e) {
    const data = e.target.result;
    const workbook = XLSX.read(data, { type: "binary" });

    const sheet = workbook.SheetNames[0];
    const ws = workbook.Sheets[sheet];

    sheetJ = XLSX.utils.sheet_to_json(ws, { header: 1 });

    if (!sheetJ || sheetJ.length < 2) {
      document.getElementById("statusMessageJ").textContent =
        "データが読み取れませんでした。";
      return;
    }

    headersJ = sheetJ[0];
    document.getElementById("statusMessageJ").textContent =
      "読み込み完了：データ行数 = " + sheetJ.length;

    setupSelectMenuJ();
  };

  reader.readAsBinaryString(file);
}

function setupSelectMenuJ() {
  const ySel = document.getElementById("ySelectJ");
  const xSel = document.getElementById("xSelectJ");

  ySel.innerHTML = "";
  xSel.innerHTML = "";

  ySel.disabled = false;
  xSel.disabled = false;

  headersJ.forEach((name, idx) => {
    const optY = document.createElement("option");
    optY.value = idx;
    optY.textContent = name;
    ySel.appendChild(optY);

    const optX = document.createElement("option");
    optX.value = idx;
    optX.textContent = name;
    xSel.appendChild(optX);
  });

  ySel.onchange = updateJAnalysis;
  xSel.onchange = updateJAnalysis;
}

function updateJAnalysis() {
  const ySel = document.getElementById("ySelectJ");
  const xSel = document.getElementById("xSelectJ");

  const yIndex = Number(ySel.value);
  const xIndex = Number(xSel.value);

  if (isNaN(yIndex) || isNaN(xIndex)) return;
  if (!sheetJ) return;

  const x = [];
  const y = [];

  for (let i = 1; i < sheetJ.length; i++) {
    const row = sheetJ[i];
    if (!row) continue;
    const xv = Number(row[xIndex]);
    const yv = Number(row[yIndex]);
    if (!isNaN(xv) && !isNaN(yv)) {
      x.push(xv);
      y.push(yv);
    }
  }

  const stat = computeRegression(x, y);
  if (!stat) return;

  currentStatJ = stat;
  currentXLabelJ = headersJ[xIndex];
  currentYLabelJ = headersJ[yIndex];

  drawChartJ(x, y, stat, currentXLabelJ, currentYLabelJ);

  document.getElementById("regressionInfoJ").innerHTML =
    `<p>Y（目的変数）：${currentYLabelJ}</p>
     <p>X（説明変数）：${currentXLabelJ}</p>
     <p>回帰直線：${currentYLabelJ} = ${stat.slope.toFixed(3)} × ${currentXLabelJ} + ${stat.intercept.toFixed(3)}</p>
     <p>相関係数 r = ${stat.r.toFixed(3)}, 決定係数 R² = ${stat.r2.toFixed(3)}</p>`;

  document.getElementById("xLabelSpanJ").textContent = currentXLabelJ;
  document.getElementById("inputXJ").value = "";
  document.getElementById("outputYJ").textContent = "";
}

function drawChartJ(xArray, yArray, stat, xLabel, yLabel) {
  const points = xArray.map((v, i) => ({ x: v, y: yArray[i] }));

  const minX = Math.min(...xArray);
  const maxX = Math.max(...xArray);

  const ctx = document.getElementById("scatterChartJ").getContext("2d");
  if (chartJ) chartJ.destroy();

  chartJ = new Chart(ctx, {
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
                `X (${xLabel}) = ${p.x}`,
                `Y (${yLabel}) = ${p.y}`
              ];
            }
          }
        },
        legend: {
          display: true
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: xLabel
          }
        },
        y: {
          title: {
            display: true,
            text: yLabel
          }
        }
      }
    }
  });
}

function calcYFromXJ() {
  const output = document.getElementById("outputYJ");

  if (!currentStatJ) {
    output.textContent = " 先に X と Y を選んでください。";
    return;
  }

  const xStr = document.getElementById("inputXJ").value;
  const x = Number(xStr);

  if (xStr === "" || isNaN(x)) {
    output.textContent = " 数値を入力してください。";
    return;
  }

  const y = currentStatJ.slope * x + currentStatJ.intercept;
  output.textContent = `→ 予測 Y（${currentYLabelJ}） ≒ ${y.toFixed(1)}`;
}
