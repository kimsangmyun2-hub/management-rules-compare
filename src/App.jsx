import { useState } from "react";
import * as XLSX from "xlsx";

export default function App() {
  const [guidelineFile, setGuidelineFile] = useState(null);
  const [currentFile, setCurrentFile] = useState(null);
  const [revisionFile, setRevisionFile] = useState(null);
  const [rows, setRows] = useState([]);

  const handleCompare = async () => {
    if (!guidelineFile || !currentFile || !revisionFile) {
      alert("3개의 파일을 모두 선택하세요.");
      return;
    }

    const formData = new FormData();
    formData.append("guideline", guidelineFile);
    formData.append("current", currentFile);
    formData.append("revision", revisionFile);

    const res = await fetch("/api/compare", {
      method: "POST",
      body: formData
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "비교표 생성 중 오류가 발생했습니다.");
      return;
    }

    setRows(data.rows || []);
  };

  const handleExcelDownload = () => {
    if (rows.length === 0) {
      alert("저장할 비교표가 없습니다.");
      return;
    }

    const excelRows = rows.map((row) => ({
      조문번호: row.article,
      "관리규약준칙(제0차)": row.guideline,
      "현행 관리규약": row.current,
      "관리규약 개정(안)": row.revision,
      개정사유: row.reason
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    worksheet["!cols"] = [
      { wch: 14 },
      { wch: 55 },
      { wch: 55 },
      { wch: 55 },
      { wch: 45 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "3단비교표");

    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `관리규약_3단비교표_${today}.xlsx`);
  };

  const getCompareType = (current, revision) => {
    if (!current && revision) return "new";
    if (current && !revision) return "deleted";
    if (current !== revision) return "changed";
    return "same";
  };

  const getTextStyle = (type) => {
    const baseStyle = {
      whiteSpace: "pre-wrap",
      background: "white",
      color: "#111827",
      lineHeight: 1.7,
      fontSize: 14
    };

    if (type === "new") {
      return {
        ...baseStyle,
        color: "#1d4ed8",
        fontWeight: 700
      };
    }

    if (type === "deleted") {
      return {
        ...baseStyle,
        color: "#dc2626",
        textDecoration: "line-through",
        textDecorationThickness: "2px"
      };
    }

    return baseStyle;
  };

  const renderDropBox = (title, description, file, setFile) => (
    <div
      style={{
        background: "white",
        border: "1px solid #d9e2ec",
        borderRadius: 18,
        padding: 22,
        boxShadow: "0 6px 20px rgba(15, 23, 42, 0.06)"
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 800, color: "#102a43" }}>{title}</div>
      <div style={{ marginTop: 6, color: "#627d98", fontSize: 14 }}>{description}</div>

      <label
        style={{
          display: "block",
          marginTop: 18,
          border: "2px dashed #7aa99b",
          borderRadius: 16,
          padding: "30px 18px",
          background: "#f7fffc",
          cursor: "pointer",
          textAlign: "center",
          minHeight: 150
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const droppedFile = e.dataTransfer.files[0];
          if (droppedFile) setFile(droppedFile);
        }}
      >
        <input
          type="file"
          accept=".txt,.hwp,.pdf"
          style={{ display: "none" }}
          onChange={(e) => setFile(e.target.files[0])}
        />

        <div style={{ fontSize: 42 }}>📁</div>
        <div style={{ marginTop: 12, fontWeight: 800, color: "#102a43" }}>
          파일을 끌어다 놓기
        </div>
        <div style={{ marginTop: 6, color: "#486581", fontSize: 14 }}>
          또는 박스를 클릭하여 파일 선택
        </div>
        <div style={{ marginTop: 10, color: "#829ab1", fontSize: 13 }}>
          지원 형식: TXT / HWP / PDF
        </div>

        {file && (
          <div
            style={{
              marginTop: 18,
              padding: "10px 12px",
              borderRadius: 10,
              background: "#d1fae5",
              color: "#065f46",
              fontWeight: 800,
              wordBreak: "break-all"
            }}
          >
            선택 완료: {file.name}
          </div>
        )}
      </label>
    </div>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #f4f7fb 0%, #eef7f4 100%)",
        fontFamily: "Arial, sans-serif",
        color: "#102a43"
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px" }}>
        <div
          style={{
            background: "white",
            borderRadius: 24,
            padding: "34px 38px",
            boxShadow: "0 12px 35px rgba(15, 23, 42, 0.08)",
            border: "1px solid #d9e2ec"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                width: 62,
                height: 62,
                borderRadius: 18,
                background: "#e6fffa",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 34
              }}
            >
              📑
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 36, letterSpacing: "-1px" }}>
                관리규약 3단비교표작성
              </h1>
              <p style={{ margin: "10px 0 0", color: "#486581", fontSize: 17 }}>
                관리규약준칙, 현행 관리규약, 관리규약 개정안을 비교하여 3단비교표와 개정사유를 자동 작성합니다.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 22,
              marginTop: 34
            }}
          >
            {renderDropBox(
              "① 관리규약준칙(제0차)",
              "비교 기준이 되는 준칙 파일",
              guidelineFile,
              setGuidelineFile
            )}
            {renderDropBox(
              "② 현행 관리규약",
              "현재 사용 중인 관리규약 파일",
              currentFile,
              setCurrentFile
            )}
            {renderDropBox(
              "③ 관리규약 개정(안)",
              "개정하려는 관리규약안 파일",
              revisionFile,
              setRevisionFile
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 34, flexWrap: "wrap" }}>
            <button
              onClick={handleCompare}
              style={{
                padding: "17px 36px",
                background: "#0f766e",
                color: "white",
                border: "none",
                borderRadius: 14,
                cursor: "pointer",
                fontSize: 19,
                fontWeight: 800,
                boxShadow: "0 8px 18px rgba(15, 118, 110, 0.25)"
              }}
            >
              3단비교표 생성
            </button>

            {rows.length > 0 && (
              <button
                onClick={handleExcelDownload}
                style={{
                  padding: "17px 30px",
                  background: "#1d4ed8",
                  color: "white",
                  border: "none",
                  borderRadius: 14,
                  cursor: "pointer",
                  fontSize: 19,
                  fontWeight: 800,
                  boxShadow: "0 8px 18px rgba(29, 78, 216, 0.22)"
                }}
              >
                엑셀 저장
              </button>
            )}
          </div>
        </div>

        {rows.length > 0 && (
          <div
            style={{
              overflowX: "auto",
              marginTop: 34,
              background: "white",
              borderRadius: 18,
              padding: 18,
              border: "1px solid #d9e2ec",
              boxShadow: "0 8px 25px rgba(15, 23, 42, 0.06)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: 22 }}>3단비교표 결과</h2>
              <button
                onClick={handleExcelDownload}
                style={{
                  padding: "10px 18px",
                  background: "#1d4ed8",
                  color: "white",
                  border: "none",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontWeight: 800
                }}
              >
                엑셀 저장
              </button>
            </div>

            <table
              cellPadding="12"
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 1500,
                background: "white"
              }}
            >
              <thead style={{ background: "#0f766e", color: "white" }}>
                <tr>
                  <th>조문번호</th>
                  <th>관리규약준칙(제0차)</th>
                  <th>현행 관리규약</th>
                  <th>관리규약 개정(안)</th>
                  <th>개정사유</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row, index) => {
                  const compareType = getCompareType(row.current, row.revision);

                  return (
                    <tr key={index} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={{ fontWeight: 700 }}>{row.article}</td>
                      <td style={getTextStyle(compareType)}>{row.guideline}</td>
                      <td style={getTextStyle(compareType)}>{row.current}</td>
                      <td style={getTextStyle(compareType)}>{row.revision}</td>
                      <td style={{ whiteSpace: "pre-wrap", background: "white", color: "#111827", lineHeight: 1.7 }}>
                        {row.reason}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
