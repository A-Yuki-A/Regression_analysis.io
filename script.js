/************************************************
 * タブ2：Jリーグ分析
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
    const xv = Number(row[xIndex]);
    const yv = Number(row[yIndex]);
    if (!isNaN(xv) && !isNaN(yv)) {
      x.push(xv);
      y.push(yv);
    }
  }

  const stat = computeRegression(x, y);
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

  output.textContent =
    `→ 予測 Y（${currentYLabelJ}） ≒ ${y.toFixed(1)}`;
}
