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

    const res = await fetch("http://localhost:3000/api/compare", {
      method: "POST",
      body: formData
    });

    const data = await res.json();
    setRows(data.rows || []);
  };

  return (
    <div style={{ padding: 30, fontFamily: "sans-serif" }}>
      <h1>📑 관리규약 3단비교표작성</h1>

      <p>
        관리규약준칙, 현행 관리규약, 관리규약 개정안을 비교하여
        3단비교표와 개정사유를 자동 작성합니다.
      </p>

      <div style={{ marginTop: 30 }}>
        <h3>① 관리규약준칙(제0차)</h3>
        <input
          type="file"
          accept=".txt,.hwp"
          onChange={(e) => setGuidelineFile(e.target.files[0])}
        />
      </div>

      <div style={{ marginTop: 30 }}>
        <h3>② 현행 관리규약</h3>
        <input
          type="file"
          accept=".txt,.hwp"
          onChange={(e) => setCurrentFile(e.target.files[0])}
        />
      </div>

      <div style={{ marginTop: 30 }}>
        <h3>③ 관리규약 개정(안)</h3>
        <input
          type="file"
          accept=".txt,.hwp"
          onChange={(e) => setRevisionFile(e.target.files[0])}
        />
      </div>

      <button
        onClick={handleCompare}
        style={{
          marginTop: 30,
          padding: "12px 20px",
          background: "#0f766e",
          color: "white",
          border: "none",
          borderRadius: 8,
          cursor: "pointer"
        }}
      >
        3단비교표 생성
      </button>

      {rows.length > 0 && (
        <div style={{ overflowX: "auto", marginTop: 40 }}>
          <table
            border="1"
            cellPadding="10"
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 1400
            }}
          >
            <thead>
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