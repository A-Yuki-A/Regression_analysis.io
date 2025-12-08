function loadExcelIce(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const workbook = XLSX.read(e.target.result, { type: "binary" });
    const sheetName = workbook.SheetNames[0];
    const ws = workbook.Sheets[sheetName];

    sheetIce = XLSX.utils.sheet_to_json(ws, { header: 1 });

    // ▼ ここからエラー判定追加 ▼

    // 行数チェック
    if (sheetIce.length < 2) {
      alert("このファイルはデータがありません。アイス売上データをアップロードしてください。");
      return;
    }

    const header = sheetIce[0];

    // C列（売上）チェック
    if (typeof sheetIce[1][2] !== "number") {
      alert("このファイルはアイス売上データではありません。（C列に数値の売上データが必要です）");
      return;
    }

    // D〜F列が数値かどうかチェック
    for (let i = 1; i < sheetIce.length; i++) {
      const row = sheetIce[i];
      const d = row[3], e2 = row[4], f = row[5];

      if (typeof d !== "number" || typeof e2 !== "number" || typeof f !== "number") {
        alert("このファイルはアイス売上データではありません。（気温データが数値ではありません）");
        return;
      }
    }

    // ▼ ここまでエラー判定 ▼

    document.getElementById("statusMessageIce").textContent =
      "読み込み完了：データ行数 = " + sheetIce.length;

    computeAllStatsIce();
    renderSummaryTableIce();
    setupSelectMenuIce();
  };

  reader.readAsBinaryString(file);
}
