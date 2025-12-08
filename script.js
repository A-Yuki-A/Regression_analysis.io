// ページが読み込まれたらまとめて設定
document.addEventListener("DOMContentLoaded", function () {
  // ===== タブ切り替え処理 =====
  const buttons = document.querySelectorAll(".tab-button");
  const contents = document.querySelectorAll(".tab-content");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");

      // ボタンの active 切り替え
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      // タブコンテンツの切り替え
      contents.forEach((c) => {
        if (c.id === targetId) {
          c.classList.add("active");
        } else {
          c.classList.remove("active");
        }
      });
    });
  });

  // ===== xlsx → テーブル表示関数 =====
  function displayTableFromSheet(sheetData, targetId) {
    const container = document.getElementById(targetId);
    if (!container) return;

    if (!sheetData || sheetData.length === 0) {
      container.innerHTML = "<p>シートにデータがありません。</p>";
      return;
    }

    let html = "<table><thead><tr>";

    const header = sheetData[0]; // 1行目をヘッダーとする
    header.forEach((cell) => {
      html += `<th>${cell !== undefined ? cell : ""}</th>`;
    });
    html += "</tr></thead><tbody>";

    // 2行目以降をデータとして扱う
    for (let i = 1; i < sheetData.length; i++) {
      const row = sheetData[i];
      // 完全に空行の場合はスキップ
      if (!row || row.every((v) => v === undefined || v === "")) continue;

      html += "<tr>";
      // ヘッダーの列数に合わせてセルをそろえる
      header.forEach((_, colIndex) => {
        const cell = row[colIndex];
        html += `<td>${cell !== undefined ? cell : ""}</td>`;
      });
      html += "</tr>";
    }

    html += "</tbody></table>";
    container.innerHTML = html;
  }

  // ===== xlsx ファイルを読み込んで最初のシートを表示 =====
  function handleXlsxFile(file, targetId) {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });

      // 最初のシートを使用
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // header:1 で2次元配列として取得
      const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      displayTableFromSheet(sheetData, targetId);
    };

    reader.readAsArrayBuffer(file);
  }

  // ===== 各タブの input にイベントを設定 =====
  const iceInput = document.getElementById("upload-ice");
  const jleagueInput = document.getElementById("upload-jleague");

  if (iceInput) {
    iceInput.addEventListener("change", function (e) {
      const file = e.target.files[0];
      handleXlsxFile(file, "data-preview-ice");
    });
  }

  if (jleagueInput) {
    jleagueInput.addEventListener("change", function (e) {
      const file = e.target.files[0];
      handleXlsxFile(file, "data-preview-jleague");
    });
  }
});
