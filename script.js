/**********************
 * タブ切り替え処理
 **********************/
document.querySelectorAll(".tab-button").forEach(btn => {
  btn.addEventListener("click", () => {

    // ボタン側の active を切り替え
    document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    // 表示するタブを切り替え
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

// Excel の列番号（固定）
const COL_YEAR = 0;
const COL_MONTH = 1;
const COL_SALES = 2;
const COL_MEAN_TEMP = 3;
const COL_MAX_TEMP = 4;
const COL_MIN_TEMP = 5;

// 対象となる説明変数（X）
const X_CANDIDATES_ICE = [
  { index: COL_MEAN_TEMP, label: "日平均気温" },
  { index: COL_MAX_TEMP,  label: "最高気温（月平均）" },
  { index: COL_MIN_TEMP,  label: "最低気温（月平均）" }
];


// イベント登録
document.getElementById("fileInputIce").addEventListener("change", loadExcelIce);
document.getElementById("calcYBtnIce").addEventListener("click", calcYFromXIce);


/**********************
 * アイス売上：Excel読み込み
 **********************/
function loadExcelIce(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const workbook = XLSX.read(e.target.result, { type: "binary" });
    const sheetName = workbook.SheetNames[0];
    const ws = workbook.Sheets[sheetName];

    sheetIce = XLSX.utils.sheet_to_json(ws, { header: 1 });

    document.getElementById("statusMessageIce").textContent =
      "読み込み完了：データ行数 = " + sheetIce.length;

    computeAllStatsIce();
    renderSummaryTableIce();
    setupSelectMenuIce();
  };

  reader.readAsBinaryString(file);
}



/**********************
 * アイス売上：相関と回帰を計算
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
 * アイス売上：表を表示
 **********************/
function renderSummaryTableIce() {
  const tbody = document.getElementById("resultBodyIce");
  tbody.innerHTML = "";

  X_CANDIDATES_ICE.forEach(col => {
    const s = statsIce[col.index];
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



/**********************
 * アイス売上：説明変数のプルダウン
 **********************/
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



/**********************
 * アイス売上：散布図＋回帰直線
 **********************/
function drawChartIce(colIndex) {
  const points = [];

  for (let i = 1; i < sheetIce.length; i++) {
    const row = sheetIce[i];
    const xv = Number(row[colIndex]);
    const yv = Number(row[COL_SALES]);
    if (!isNaN(xv) && !isNaN(yv)) {
      points.push({
        x: xv,
        y: yv,
        year: row[COL_YEAR],
        month: row[COL_MONTH]
      });
    }
  }

  const stat = statsIce[colIndex];
  currentStatIce = stat;
  currentLabelIce = X_CANDIDATES_ICE.find(c => c.index === colIndex).label;

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
            label: context => {
              const p = context.raw;
              return [
                `${p.year}年 ${p.month}月`,
                `X = ${p.x}`,
                `Y（アイス売上） = ${p.y}`
              ];
            }
          }
        }
      }
    }
  });

  document.getElementById("regressionInfoIce").innerHTML =
    `<p>説明変数：${currentLabelIce}</p>
     <p>回帰直線：Y = ${stat.slope.toFixed(3)}X + ${stat.intercept.toFixed(3)}</p>
     <p>相関係数 r = ${stat.r.toFixed(3)}, 決定係数 R² = ${stat.r2.toFixed(3)}</p>`;

  document.getElementById("xLabelSpanIce").textContent = currentLabelIce;
}




/**********************
 * アイス売上：X を入れて Y を予測
 **********************/
function calcYFromXIce() {
  if (!currentStatIce) {
    document.getElementById("outputYIce").textContent = "説明変数を選んでください。";
    return;
  }

  const x = Number(document.getElementById("inputXIce").value);
  if (isNaN(x)) {
    document.getElementById("outputYIce").textContent = "数値を入力してください。";
    return;
  }

  const y = currentStatIce.slope * x + currentStatIce.intercept;
  document.getElementById("outputYIce").textContent =
    `→ 予測 Y（アイス売上） ≒ ${y.toFixed(1)}`;
}






/************************************************
 * 【B】Jリーグ分析
 ************************************************/

let sheetJ = null;
let chartJ = null;
let currentStatJ = null;
let headersJ = [];
let currentXLabelJ = "";
let currentYLabelJ = "";

document.getElementById("fileInputJ").addEventListener("change", loadExcelJ);
document.getElementById("calcYBtnJ").addEventListener("click", calcYFromXJ);


/**********************
 * Jリーグ：Excel読み込み
 **********************/
function loadExcelJ(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const workbook = XLSX.read(e.target.result, { type: "binary" });
    const sheetName = workbook.SheetNames[0];
    const ws = workbook.Sheets[sheetName];

    sheetJ = XLSX.utils.sheet_to_json(ws, { header: 1 });
    headersJ = sheetJ[0];

    document.getElementById("statusMessageJ").textContent =
      "読み込み完了：列数 = " + headersJ.length;

    setupSelectMenuJ();
  };
  reader.readAsBinaryString(file);
}



/**********************
 * Jリーグ：X・Y 選択メニュー
 **********************/
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



/**********************
 * Jリーグ：回帰分析の更新
 **********************/
function updateJAnalysis() {
  const yIdx = Number(document.getElementById("ySelectJ").value);
  const xIdx = Number(document.getElementById("xSelectJ").value);

  if (isNaN(yIdx) || isNaN(xIdx)) return;

  const x = [];
  const y = [];

  for (let i = 1; i < sheetJ.length; i++) {
    const row = sheetJ[i];
    const xv = Number(row[xIdx]);
    const yv = Number(row[yIdx]);
    if (!isNaN(xv) && !isNaN(yv)) {
      x.push(xv);
      y.push(yv);
    }
  }

  const stat = computeRegression(x, y);
  if (!stat) return;

  currentStatJ = stat;
  currentXLabelJ = headersJ[xIdx];
  currentYLabelJ = headersJ[yIdx];

  drawChartJ(x, y, stat);
}



/**********************
 * Jリーグ：散布図＋回帰直線
 **********************/
function drawChartJ(xArray, yArray, stat) {
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
            label: context => {
              const p = context.raw;
              return [
                `X = ${p.x}`,
                `Y = ${p.y}`
              ];
            }
          }
        }
      },
      scales: {
        x: { title: { display: true, text: currentXLabelJ } },
        y: { title: { display: true, text: currentYLabelJ } }
      }
    }
  });

  document.getElementById("regressionInfoJ").innerHTML =
    `<p>Y：${currentYLabelJ}</p>
     <p>X：${currentXLabelJ}</p>
     <p>回帰直線：Y = ${stat.slope.toFixed(3)}X + ${stat.intercept.toFixed(3)}</p>
     <p>相関係数 r = ${stat.r.toFixed(3)}, 決定係数 R² = ${stat.r2.toFixed(3)}</p>`;

  document.getElementById("xLabelSpanJ").textContent = currentXLabelJ;
}



/**********************
 * Jリーグ：X→Y 予測
 **********************/
function calcYFromXJ() {
  if (!currentStatJ) {
    document.getElementById("outputYJ").textContent =
      "先に X と Y を選んでください。";
    return;
  }

  const x = Number(document.getElementById("inputXJ").value);
  if (isNaN(x)) {
    document.getElementById("outputYJ").textContent = "数値を入力してください。";
    return;
  }

  const y = currentStatJ.slope * x + currentStatJ.intercept;
  document.getElementById("outputYJ").textContent =
    `→ 予測 Y（${currentYLabelJ}） ≒ ${y.toFixed(1)}`;
}
