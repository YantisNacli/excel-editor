"use client";

import React, { useState } from "react";
import * as XLSX from "xlsx";
import { DataGrid, type Column } from "react-data-grid";

type Row = { id: number; [key: string]: any };

type SheetData = { name: string; arr: any[][] };
type FileData = { name: string; sheets: SheetData[] };

export default function ExcelEditor() {
  const [userName, setUserName] = useState<string>("");
  const [isNameSubmitted, setIsNameSubmitted] = useState(false);
  const [partNumber, setPartNumber] = useState<string>("");
  const [isPartNumberSubmitted, setIsPartNumberSubmitted] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingPartNumber, setIsSavingPartNumber] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [actualCount, setActualCount] = useState<string>("");
  const [newQuantity, setNewQuantity] = useState<string>("");
  const [isQuantitySubmitted, setIsQuantitySubmitted] = useState(false);
  const [isSavingQuantity, setIsSavingQuantity] = useState(false);
  const [files, setFiles] = useState<FileData[]>([]);
  const [activeFile, setActiveFile] = useState<number | null>(null);
  const [activeSheet, setActiveSheet] = useState<number>(0);
  const [useHeader, setUseHeader] = useState(true);
  const [columns, setColumns] = useState<Column<Row>[]>([]);
  const [rows, setRows] = useState<Row[]>([]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputFiles = e.target.files;
    if (!inputFiles) return;
    const parsedFiles: FileData[] = [];
    let pending = inputFiles.length;
    for (let i = 0; i < inputFiles.length; i++) {
      const f = inputFiles[i];
      const reader = new FileReader();
      reader.onload = (ev) => {
        const data = ev.target?.result;
        const wb = XLSX.read(data, { type: "array" });
        const fileSheets: SheetData[] = wb.SheetNames.map((s) => {
          const ws = wb.Sheets[s];
          const arr = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
          return { name: s, arr };
        });
        parsedFiles.push({ name: f.name, sheets: fileSheets });
        pending--;
        if (pending === 0) {
          setFiles((prev) => [...prev, ...parsedFiles]);
          if (activeFile === null && parsedFiles.length > 0) {
            setActiveFile(0);
            setActiveSheet(0);
            loadParsed(parsedFiles[0].sheets[0].arr, true);
          }
        }
      };
      reader.readAsArrayBuffer(f);
    }
  };

  const loadParsed = (arr: any[][], header = true) => {
    const maxCols = arr.length === 0 ? 0 : Math.max(...arr.map((r) => (r ? r.length : 0)));
    const headerRow = header ? arr[0] ?? [] : Array.from({ length: maxCols }, (_, i) => `Col ${i + 1}`);
    const cols: Column<Row>[] = Array.from({ length: maxCols }, (_, i) => ({
      key: "c" + i,
      name: headerRow[i] ?? `Col ${i + 1}`,
      editable: true,
      resizable: true,
    }));
    const dataStart = header ? 1 : 0;
    const dataRows = arr.slice(dataStart).map((r, idx) => {
      const obj: Row = { id: idx } as Row;
      for (let i = 0; i < maxCols; i++) obj["c" + i] = (r && r[i] !== undefined) ? r[i] : "";
      return obj;
    });
    setColumns(cols);
    setRows(dataRows);
  };

  const handleSelectFile = (index: number) => {
    setActiveFile(index);
    setActiveSheet(0);
    loadParsed(files[index].sheets[0].arr, useHeader);
  };

  const handleSelectSheet = (sheetIndex: number) => {
    if (activeFile === null) return;
    setActiveSheet(sheetIndex);
    loadParsed(files[activeFile].sheets[sheetIndex].arr, useHeader);
  };

  const handleExport = () => {
    if (activeFile === null) return;
    const file = files[activeFile];
    const out = [columns.map((c) => c.name), ...rows.map((r) => columns.map((c) => r[c.key] ?? ""))];
    const ws = XLSX.utils.aoa_to_sheet(out);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, file.sheets[activeSheet]?.name ?? "Sheet1");
    XLSX.writeFile(wb, file.name.replace(/\.[^.]+$/, "") + "-edited.xlsx");
  };

  const handleAddRow = () => {
    const next: Row = { id: rows.length } as Row;
    columns.forEach((c) => (next[c.key] = ""));
    setRows((r) => [...r, next]);
  };

  const handleDeleteLastRow = () => {
    setRows((r) => r.slice(0, -1));
  };

  const handleToggleHeader = (val: boolean) => {
    setUseHeader(val);
    if (activeFile !== null) {
      loadParsed(files[activeFile].sheets[activeSheet].arr, val);
    }
  };

  const handleSaveServer = async () => {
    if (activeFile === null) return;
    const file = files[activeFile];
    const out = [columns.map((c) => c.name), ...rows.map((r) => columns.map((c) => r[c.key] ?? ""))];
    const ws = XLSX.utils.aoa_to_sheet(out);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, file.sheets[activeSheet]?.name ?? "Sheet1");
    const base64 = XLSX.write(wb, { bookType: "xlsx", type: "base64" });
    const filename = file.name.replace(/\.[^.]+$/, "") + "-edited.xlsx";
    const res = await fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, base64 }),
    });
    if (res.ok) {
      alert("Saved to server uploads/" + filename);
    } else {
      alert("Save failed");
    }
  };

  const handleSubmitName = async () => {
    if (!userName.trim()) return;
    setIsSavingName(true);
    try {
      // Just move to next question, don't save yet
      setIsNameSubmitted(true);
    } catch (error) {
      console.error("Error:", error);
      alert("Error");
    } finally {
      setIsSavingName(false);
    }
  };

  const searchPartNumbers = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch("/api/searchPartNumbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.matches || []);
        setShowSuggestions(data.matches.length > 0);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error("Error searching part numbers:", error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePartNumberChange = (value: string) => {
    setPartNumber(value);
    searchPartNumbers(value);
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setPartNumber(suggestion);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleSubmitPartNumber = async () => {
    if (!partNumber.trim()) return;

    setIsSavingPartNumber(true);
    setShowSuggestions(false);
    try {
      // Get actual count from Excel
      const countRes = await fetch("/api/getActualCount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partNumber }),
      });

      if (countRes.ok) {
        const data = await countRes.json();
        setActualCount(data.actualCount);
      } else {
        setActualCount("Unable to fetch count");
      }

      setIsPartNumberSubmitted(true);
    } catch (error) {
      console.error("Error getting count:", error);
      alert("Error getting count");
    } finally {
      setIsSavingPartNumber(false);
    }
  };

  const handleSubmitQuantity = async () => {
    if (!newQuantity.trim()) return;

    setIsSavingQuantity(true);
    try {
      // Save to database with the name, part number, and quantity
      const saveRes = await fetch("/api/saveName", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: userName, partNumber, quantity: newQuantity }),
      });

      if (!saveRes.ok) {
        const errorData = await saveRes.json();
        alert(`Failed to save: ${errorData.error || 'Unknown error'}`);
        return;
      }

      setIsQuantitySubmitted(true);
    } catch (error) {
      console.error("Error saving quantity:", error);
      alert("Error saving quantity");
    } finally {
      setIsSavingQuantity(false);
    }
  };

  if (!isNameSubmitted) {
    return (
      <div className="p-4">
        <div className="max-w-md mx-auto mt-12 border rounded-lg p-6 bg-gray-50">
          <h2 className="text-xl font-bold mb-4">Welcome to Excel Editor</h2>
          <label className="block mb-2 font-semibold">Please enter your name:</label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && userName.trim() && !isSavingName) {
                handleSubmitName();
              }
            }}
            placeholder="Your name"
            className="w-full px-3 py-2 border rounded mb-4"
            autoFocus
            disabled={isSavingName}
          />
          <button
            onClick={handleSubmitName}
            disabled={!userName.trim() || isSavingName}
            className="w-full px-3 py-2 bg-blue-500 text-white rounded font-semibold disabled:bg-gray-400"
          >
            {isSavingName ? "Saving..." : "Continue"}
          </button>
        </div>
      </div>
    );
  }

  if (!isPartNumberSubmitted) {
    return (
      <div className="p-4">
        <div className="max-w-md mx-auto mt-12 border rounded-lg p-6 bg-gray-50">
          <h2 className="text-xl font-bold mb-4">Part Number</h2>
          <p className="mb-4 text-sm text-gray-900">
            Welcome, <span className="font-semibold">{userName}</span>!
          </p>
          <label className="block mb-2 font-semibold">What part number do you want to take out?</label>
          <div className="relative mb-4">
            <input
              type="text"
              value={partNumber}
              onChange={(e) => handlePartNumberChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && partNumber.trim() && !isSavingPartNumber) {
                  handleSubmitPartNumber();
                } else if (e.key === "Escape") {
                  setShowSuggestions(false);
                }
              }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              onFocus={() => {
                if (suggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              placeholder="Part number"
              className="w-full px-3 py-2 border rounded"
              autoFocus
              disabled={isSavingPartNumber}
            />
            {isSearching && (
              <div className="absolute right-3 top-3 text-gray-500 text-sm">
                Searching...
              </div>
            )}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className="px-3 py-2 hover:bg-blue-100 cursor-pointer border-b last:border-b-0"
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleSubmitPartNumber}
            disabled={!partNumber.trim() || isSavingPartNumber}
            className="w-full px-3 py-2 bg-blue-500 text-white rounded font-semibold disabled:bg-gray-400"
          >
            {isSavingPartNumber ? "Loading..." : "Continue"}
          </button>
        </div>
      </div>
    );
  }

  if (!isQuantitySubmitted) {
    return (
      <div className="p-4">
        <div className="max-w-md mx-auto mt-12 border rounded-lg p-6 bg-gray-50">
          <h2 className="text-xl font-bold mb-4">Current Stock</h2>
          <p className="mb-4 text-sm text-gray-900">
            Part: <span className="font-semibold">{partNumber}</span>
          </p>
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-bold text-lg mb-2">Current Actual Count:</h3>
            <p className="text-2xl font-semibold text-blue-700">{actualCount}</p>
          </div>
          <label className="block mb-2 font-semibold">How much are you adding or removing?</label>
          <p className="text-sm text-gray-600 mb-3">Use + for adding or - for removing (e.g., +5 or -3)</p>
          <input
            type="text"
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newQuantity.trim() && !isSavingQuantity) {
                handleSubmitQuantity();
              }
            }}
            placeholder="+5 or -3"
            className="w-full px-3 py-2 border rounded mb-4"
            autoFocus
            disabled={isSavingQuantity}
          />
          <button
            onClick={handleSubmitQuantity}
            disabled={!newQuantity.trim() || isSavingQuantity}
            className="w-full px-3 py-2 bg-blue-500 text-white rounded font-semibold disabled:bg-gray-400"
          >
            {isSavingQuantity ? "Saving..." : "Continue"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4 text-sm text-gray-900">
        Welcome, <span className="font-semibold">{userName}</span>! Part Number: <span className="font-semibold">{partNumber}</span>
      </div>
      <div className="mb-4">
        <label className="block mb-2">Upload Excel files (xlsx/xls)</label>
        <input type="file" multiple accept=".xlsx,.xls" onChange={onFileChange} />
      </div>

      <div className="mb-4 flex gap-2">
        {files.map((f, idx) => (
          <button
            key={f.name}
            className={`px-3 py-1 border ${idx === activeFile ? "bg-blue-500 text-white" : ""}`}
            onClick={() => handleSelectFile(idx)}
          >
            {f.name}
          </button>
        ))}
      </div>

      {activeFile !== null && (
        <div>
          <div className="mb-2 flex gap-2 items-center">
            <strong>{files[activeFile].name}</strong>
            <select value={activeSheet} onChange={(e) => handleSelectSheet(Number(e.target.value))} className="ml-4 border px-2 py-1">
              {files[activeFile].sheets.map((s, i) => (
                <option key={s.name} value={i}>{s.name}</option>
              ))}
            </select>
            <label className="ml-4 flex items-center gap-2">
              <input type="checkbox" checked={useHeader} onChange={(e) => handleToggleHeader(e.target.checked)} /> Use header row
            </label>
            <button onClick={handleExport} className="ml-4 px-3 py-1 border bg-green-500 text-white">
              Export edited file
            </button>
            <button onClick={handleSaveServer} className="ml-2 px-3 py-1 border bg-yellow-500 text-black">
              Save to server
            </button>
          </div>

          <div className="mb-2 flex gap-2">
            <button onClick={handleAddRow} className="px-3 py-1 border">Add row</button>
            <button onClick={handleDeleteLastRow} className="px-3 py-1 border">Delete last row</button>
          </div>

          <div style={{ height: 500 }}>
            <DataGrid columns={columns} rows={rows} onRowsChange={setRows} />
          </div>
        </div>
      )}
    </div>
  );
}
