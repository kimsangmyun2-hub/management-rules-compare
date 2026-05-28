import { useState } from "react";

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
    setRows(data.rows || []);
  };

  const dropBoxStyle = {
    border: "2px dashed #0f766e",
    borderRadius: 14,
    padding: 30,
    marginTop: 12,
    background: "#f8fffd",
    cursor: "pointer",
    textAlign: "center"
  };

  const renderDropBox = (title, file, setFile) => (
    <div style={{ marginTop: 35 }}>
      <h3 style={{ marginBottom: 10 }}>{title}</h3>

      <label
        style={dropBoxStyle}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const droppedFile = e.dataTransfer.files[0];
          if (droppedFile) setFile(droppedFile);
        }}
      >
        <input
          type="file"
          accept=".txt,.hwp"
          style={{ display: "none" }}
          onChange={(e) => setFile(e.target.files[0])}
        />

        <div style={{ fontSize: 42 }}>📂</div>

        <div style={{ marginTop: 10, fontWeight: "bold" }}>
          파일을 끌어다 놓거나 클릭하여 업로드
        </div>

        <div style={{ marginTop: 10, color: "#666" }}>
          지원 형식: TXT / HWP
        </div>

        {file && (
          <div
            style={{
              marginTop: 18,
              padding: 10,
              borderRadius: 8,
              background: "#d1fae5",
              color: "#065f46",
              fontWeight: "bold"
            }}
          >
            선택 파일: {file.name}
          </div>
        )}
      </label>
    </div>
  );

  return (
    <div
      style={{
        padding: 30,
        fontFamily: "sans-serif",
        maxWidth: 1600,
        margin: "0 auto"
      }}
    >
      <h1 style={{ fontSize: 48, marginBottom: 10 }}>
        📑 관리규약 3단비교표작성
      </h1>

      <p style={{ fontSize: 20, lineHeight: 1.6 }}>
        관리규약준칙, 현행 관리규약, 관리규약 개정안을 비교하여
        3단비교표와 개정사유를 자동 작성합니다.
      </p>

      {renderDropBox(
        "① 관리규약준칙(제0차)",
        guidelineFile,
        setGuidelineFile
      )}

      {renderDropBox(
        "② 현행 관리규약",
        currentFile,
        setCurrentFile
      )}

      {renderDropBox(
        "③ 관리규약 개정(안)",
        revisionFile,
        setRevisionFile
      )}

      <button
        onClick={handleCompare}
        style={{
          marginTop: 40,
          padding: "16px 28px",
          background: "#0f766e",
          color: "white",
          border: "none",
          borderRadius: 12,
          cursor: "pointer",
          fontSize: 20,
          fontWeight: "bold"
        }}
      >
        3단비교표 생성
      </button>

      {rows.length > 0 && (
        <div style={{ overflowX: "auto", marginTop: 50 }}>
          <table
            border="1"
            cellPadding="12"
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 1600,
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
              {rows.map((row, index) => (
                <tr key={index}>
                  <td>{row.article}</td>
                  <td style={{ whiteSpace: "pre-wrap" }}>{row.guideline}</td>
                  <td style={{ whiteSpace: "pre-wrap" }}>{row.current}</td>
                  <td style={{ whiteSpace: "pre-wrap" }}>{row.revision}</td>
                  <td style={{ whiteSpace: "pre-wrap" }}>{row.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}