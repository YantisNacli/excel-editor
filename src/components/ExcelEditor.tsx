"use client";

import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { DataGrid, type Column } from "react-data-grid";
import { scanPartNumbersFromBlob, scanPartNumbersFromCanvas } from "../lib/textScan";

type Row = { id: number; [key: string]: any };

type SheetData = { name: string; arr: any[][] };
type FileData = { name: string; sheets: SheetData[] };

export default function ExcelEditor() {
  const [userEmail, setUserEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authError, setAuthError] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [partNumber, setPartNumber] = useState<string>("");
  const [isNameSubmitted, setIsNameSubmitted] = useState(false);
  const [isPartNumberSubmitted, setIsPartNumberSubmitted] = useState(false);
  const [isSavingPartNumber, setIsSavingPartNumber] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [actualCount, setActualCount] = useState<string>("");
  const [newQuantity, setNewQuantity] = useState<string>("");
  const [isQuantitySubmitted, setIsQuantitySubmitted] = useState(false);
  const [isSavingQuantity, setIsSavingQuantity] = useState(false);
  const [location, setLocation] = useState<string>("");
  const [batchMode, setBatchMode] = useState(false);
  const [batchItems, setBatchItems] = useState<Array<{partNumber: string, quantity: string}>>([]);
  const [currentBatchPart, setCurrentBatchPart] = useState<string>("");
  const [currentBatchQty, setCurrentBatchQty] = useState<string>("");
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isScanningImage, setIsScanningImage] = useState(false);
  const [scanResults, setScanResults] = useState<string[]>([]);
  const [scanError, setScanError] = useState<string>("");
  const [files, setFiles] = useState<FileData[]>([]);
  const [activeFile, setActiveFile] = useState<number | null>(null);
  const [activeSheet, setActiveSheet] = useState<number>(0);
  const [useHeader, setUseHeader] = useState(true);
  const [columns, setColumns] = useState<Column<Row>[]>([]);
  const [rows, setRows] = useState<Row[]>([]);

  // Auto-authenticate user on mount
  useEffect(() => {
    const checkExistingSession = () => {
      const sessionToken = localStorage.getItem('stockTrackerSessionToken');
      const email = localStorage.getItem('stockTrackerUserEmail');
      const name = localStorage.getItem('stockTrackerUserName');
      const role = localStorage.getItem('stockTrackerUserRole');

      if (sessionToken && email && name && role) {
        // User has an existing session
        setUserEmail(email);
        setUserName(name);
        setUserRole(role);
        setIsAuthenticated(true);
      }
      setIsCheckingAuth(false);
    };

    checkExistingSession();
  }, []);

  const handleLogin = async () => {
    if (!userEmail.trim() || !password.trim()) {
      setAuthError("Please enter your email and password");
      return;
    }

    setIsLoggingIn(true);
    setAuthError("");

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail.trim(), password: password }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.mustChangePassword) {
          // User must change password before continuing
          setUserEmail(data.user.email);
          setUserName(data.user.name);
          setUserRole(data.user.role);
          setMustChangePassword(true);
        } else {
          // Normal login success
          setUserEmail(data.user.email);
          setUserName(data.user.name);
          setUserRole(data.user.role);
          setIsAuthenticated(true);
          localStorage.setItem('stockTrackerSessionToken', data.sessionToken);
          localStorage.setItem('stockTrackerUserEmail', data.user.email);
          localStorage.setItem('stockTrackerUserName', data.user.name);
          localStorage.setItem('stockTrackerUserRole', data.user.role);
        }
      } else {
        setAuthError(data.error || "Login failed");
      }
    } catch (error) {
      console.error('Login error:', error);
      setAuthError("Login failed. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      setAuthError("Please enter and confirm your new password");
      return;
    }

    if (newPassword !== confirmPassword) {
      setAuthError("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setAuthError("Password must be at least 6 characters");
      return;
    }

    setIsChangingPassword(true);
    setAuthError("");

    try {
      const response = await fetch('/api/changePassword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: userEmail, 
          currentPassword: password,
          newPassword: newPassword 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Password changed successfully, now log them in
        setMustChangePassword(false);
        setIsAuthenticated(true);
        
        // Generate a session token (reuse login logic)
        const sessionToken = Buffer.from(
          `${userEmail}:${Date.now()}:${Math.random()}`
        ).toString('base64');
        
        localStorage.setItem('stockTrackerSessionToken', sessionToken);
        localStorage.setItem('stockTrackerUserEmail', userEmail);
        localStorage.setItem('stockTrackerUserName', userName);
        localStorage.setItem('stockTrackerUserRole', userRole);
        
        setPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setAuthError(data.error || "Failed to change password");
      }
    } catch (error) {
      console.error('Change password error:', error);
      setAuthError("Failed to change password. Please try again.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleChangeUser = () => {
    localStorage.removeItem('stockTrackerSessionToken');
    localStorage.removeItem('stockTrackerUserEmail');
    localStorage.removeItem('stockTrackerUserName');
    localStorage.removeItem('stockTrackerUserRole');
    setUserEmail("");
    setUserName("");
    setUserRole("");
    setPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setIsAuthenticated(false);
    setMustChangePassword(false);
    setAuthError("");
  };

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

  // Validate part numbers against database - returns all valid part numbers
  const validatePartNumbers = async (partNumbers: string[]): Promise<string[]> => {
    if (partNumbers.length === 0) return [];

    // Generate variations for each part number to handle OCR mistakes
    const allVariations: string[] = [];
    partNumbers.forEach(partNum => {
      allVariations.push(partNum); // Original
      
      // Create variations with common character swaps
      const variations = [
        partNum.replace(/8/g, 'B'),  // Try 8 as B
        partNum.replace(/B/g, '8'),  // Try B as 8
        partNum.replace(/0/g, 'O'),  // Try 0 as O
        partNum.replace(/O/g, '0'),  // Try O as 0
        partNum.replace(/1/g, 'I'),  // Try 1 as I
        partNum.replace(/I/g, '1'),  // Try I as 1
        partNum.replace(/5/g, 'S'),  // Try 5 as S
        partNum.replace(/S/g, '5'),  // Try S as 5
      ];
      
      allVariations.push(...variations);
    });

    // Remove duplicates
    const uniqueVariations = [...new Set(allVariations)];

    try {
      const res = await fetch("/api/validatePartNumbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partNumbers: uniqueVariations }),
      });

      if (res.ok) {
        const data = await res.json();
        return data.validPartNumbers || [];
      }
    } catch (error) {
      console.error("Error validating part numbers:", error);
    }
    return [];
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
    setShowSuggestions(true);
    searchPartNumbers(value);
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setPartNumber(suggestion);
    setShowSuggestions(false);
  };

  const handleSubmitPartNumber = async () => {
    if (!partNumber.trim()) return;

    setIsSavingPartNumber(true);
    setShowSuggestions(false);
    setSuggestions([]);
    try {
      // Get actual count from Excel
      const countRes = await fetch("/api/getActualCount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partNumber }),
      });

      if (countRes.ok) {
        const data = await countRes.json();
        
        // Check if part number was found
        if (data.actualCount === "Part number not found in inventory") {
          alert("Part number not found in inventory. Please check and try again.");
          setIsSavingPartNumber(false);
          return;
        }
        
        setActualCount(data.actualCount);
        setIsPartNumberSubmitted(true);

        // For Viewer role, skip quantity question and go directly to showing location
        if (userRole === "viewer") {
          // Get location immediately
          const locRes = await fetch("/api/getLocation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ partNumber }),
          });

          if (locRes.ok) {
            const locData = await locRes.json();
            setLocation(locData.location);
            setIsQuantitySubmitted(true);
          } else {
            setLocation("Unable to fetch location");
            setIsQuantitySubmitted(true);
          }
          // Note: Viewers don't record their searches in the database
        }
      } else {
        alert("Unable to fetch count. Please try again.");
      }
    } catch (error) {
      console.error("Error getting count:", error);
      alert("Error getting count");
    } finally {
      setIsSavingPartNumber(false);
    }
  };

  const handleSubmitQuantity = async () => {
    if (!newQuantity.trim()) return;

    // Validate format: must start with + or - followed by a number
    const trimmed = newQuantity.trim();
    const regex = /^[+-]\d+$/;
    
    if (!regex.test(trimmed)) {
      alert("Please enter a valid quantity format. Use +5 to add or -3 to remove.");
      return;
    }

    // Check if deducting more than available
    const currentCount = parseInt(actualCount) || 0;
    const quantityChange = parseInt(trimmed);
    
    if (quantityChange < 0 && Math.abs(quantityChange) > currentCount) {
      alert(`Cannot remove ${Math.abs(quantityChange)} items. Only ${currentCount} items in inventory.`);
      return;
    }

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

      // Get location from Excel first (fast)
      const locRes = await fetch("/api/getLocation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partNumber }),
      });

      if (locRes.ok) {
        const data = await locRes.json();
        setLocation(data.location);
      } else {
        setLocation("Unable to fetch location");
      }

      setIsQuantitySubmitted(true);

      // Update the actual count in Excel in the background (slow)
      fetch("/api/updateActualCount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partNumber, quantityChange: newQuantity }),
      }).catch(error => {
        console.error("Failed to update Excel file:", error);
      });
    } catch (error) {
      console.error("Error saving quantity:", error);
      alert("Error saving quantity");
    } finally {
      setIsSavingQuantity(false);
    }
  };

  // Show loading or auth screens
  if (isCheckingAuth) {
    return (
      <div className="p-4">
        <div className="max-w-md mx-auto mt-12 border rounded-lg p-6 bg-gray-50">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-4">Loading...</h2>
            <p className="text-gray-600">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  // Password change screen (first-time login)
  if (mustChangePassword) {
    return (
      <div className="p-4">
        <div className="max-w-md mx-auto mt-12 border rounded-lg p-6 bg-yellow-50 border-yellow-300">
          <h2 className="text-xl font-bold mb-4 text-gray-900">Change Password Required</h2>
          <p className="mb-4 text-gray-700">
            Welcome <strong>{userName}</strong>! You must change your password before continuing.
          </p>
          
          {authError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded text-red-700">
              {authError}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleChangePassword();
                }
              }}
              placeholder="Enter new password (min 6 characters)"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleChangePassword();
                }
              }}
              placeholder="Confirm new password"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleChangePassword}
            disabled={isChangingPassword || !newPassword.trim() || !confirmPassword.trim()}
            className="w-full px-3 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400 mb-2"
          >
            {isChangingPassword ? "Changing Password..." : "Change Password"}
          </button>

          <button
            onClick={handleChangeUser}
            className="w-full px-3 py-2 bg-gray-200 text-gray-700 rounded font-semibold hover:bg-gray-300"
          >
            ← Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="p-4">
        <div className="max-w-md mx-auto mt-12 border rounded-lg p-6 bg-gray-50">
          <h2 className="text-xl font-bold mb-4 text-gray-900">Sign In</h2>
          <p className="mb-4 text-gray-600">Enter your email and password to access the system</p>
          
          {authError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded text-red-700">
              {authError}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <input
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleLogin();
                }
              }}
              placeholder="your.email@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleLogin();
                }
              }}
              placeholder="Enter your password"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={isLoggingIn || !userEmail.trim() || !password.trim()}
            className="w-full px-3 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isLoggingIn ? "Signing in..." : "Sign In"}
          </button>

          <p className="mt-4 text-xs text-gray-500 text-center">
            Only authorized users can access this system
          </p>
        </div>
      </div>
    );
  }

  const handleAddToBatch = async () => {
    // For Viewer role, only part number is required
    if (userRole === "viewer") {
      if (!currentBatchPart.trim()) return;

      // Validate part number exists
      const countRes = await fetch("/api/getActualCount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partNumber: currentBatchPart }),
      });

      if (countRes.ok) {
        const data = await countRes.json();
        if (data.actualCount === "Part number not found in inventory") {
          alert("Part number not found in inventory. Please check and try again.");
          return;
        }
      }

      // Add to batch with empty quantity for viewer
      setBatchItems([...batchItems, { partNumber: currentBatchPart, quantity: "" }]);
      setCurrentBatchPart("");
      setShowSuggestions(false);
      return;
    }

    // For non-viewer roles (admin/operator)
    if (!currentBatchPart.trim() || !currentBatchQty.trim()) return;

    // Validate quantity format
    const trimmed = currentBatchQty.trim();
    const regex = /^[+-]\d+$/;
    if (!regex.test(trimmed)) {
      alert("Please enter a valid quantity format. Use +5 to add or -3 to remove.");
      return;
    }

    // Validate part number exists
    const countRes = await fetch("/api/getActualCount", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partNumber: currentBatchPart }),
    });

    if (countRes.ok) {
      const data = await countRes.json();
      if (data.actualCount === "Part number not found in inventory") {
        alert("Part number not found in inventory. Please check and try again.");
        return;
      }
      
      // Check if deducting more than available
      const currentCount = parseInt(data.actualCount) || 0;
      const quantityChange = parseInt(trimmed);
      
      if (quantityChange < 0 && Math.abs(quantityChange) > currentCount) {
        alert(`Cannot remove ${Math.abs(quantityChange)} items from ${currentBatchPart}. Only ${currentCount} items in inventory.`);
        return;
      }
    }

    // Add to batch
    setBatchItems([...batchItems, { partNumber: currentBatchPart, quantity: currentBatchQty }]);
    setCurrentBatchPart("");
    setCurrentBatchQty("");
    setShowSuggestions(false);
  };

  const handleRemoveFromBatch = (index: number) => {
    setBatchItems(batchItems.filter((_, i) => i !== index));
  };

  const handleSubmitBatch = async () => {
    if (batchItems.length === 0) return;

    // For Viewer role, just fetch and display information
    if (userRole === "viewer") {
      setIsProcessingBatch(true);
      try {
        const results: Array<{partNumber: string, actualCount: string, location: string}> = [];

        // Get count and location for each item
        for (const item of batchItems) {
          // Get actual count
          const countRes = await fetch("/api/getActualCount", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ partNumber: item.partNumber }),
          });

          let actualCount = "Unknown";
          if (countRes.ok) {
            const data = await countRes.json();
            actualCount = data.actualCount;
          }

          // Get location
          const locRes = await fetch("/api/getLocation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ partNumber: item.partNumber }),
          });

          let locationStr = "Unknown";
          if (locRes.ok) {
            const data = await locRes.json();
            locationStr = data.location;
          }

          results.push({ partNumber: item.partNumber, actualCount, location: locationStr });
        }

        // Clear batch items and show results
        setBatchItems([]);
        setIsPartNumberSubmitted(true);
        setIsQuantitySubmitted(true);
        
        // Create summary display: partNumber:quantity:location
        const locationSummary = results.map(r => `${r.partNumber}: ${r.actualCount}: ${r.location}`).join("\n");
        setLocation(locationSummary);
      } catch (error) {
        console.error("Error processing batch:", error);
        alert("Error processing batch");
      } finally {
        setIsProcessingBatch(false);
      }
      return;
    }

    // For non-viewer roles (admin/operator)
    // Validate all quantities before submitting
    const regex = /^[+-]\d+$/;
    const invalidItems = batchItems.filter(item => !regex.test(item.quantity.trim()));
    
    if (invalidItems.length > 0) {
      alert(`Invalid quantity format for: ${invalidItems.map(item => item.partNumber).join(", ")}.\nPlease use +5 to add or -3 to remove.`);
      return;
    }

    // Validate that deductions don't exceed available inventory
    for (const item of batchItems) {
      const quantityChange = parseInt(item.quantity.trim());
      
      if (quantityChange < 0) {
        // Get current inventory count
        const countRes = await fetch("/api/getActualCount", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ partNumber: item.partNumber }),
        });

        if (countRes.ok) {
          const data = await countRes.json();
          const currentCount = parseInt(data.actualCount) || 0;
          
          if (Math.abs(quantityChange) > currentCount) {
            alert(`Cannot remove ${Math.abs(quantityChange)} items from ${item.partNumber}. Only ${currentCount} items in inventory.`);
            return;
          }
        }
      }
    }

    setIsProcessingBatch(true);
    try {
      const locations: Array<{partNumber: string, location: string}> = [];

      // Process all items - save to DB and get locations
      for (const item of batchItems) {
        // Save to database
        await fetch("/api/saveName", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: userName, partNumber: item.partNumber, quantity: item.quantity }),
        });

        // Get location
        const locRes = await fetch("/api/getLocation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ partNumber: item.partNumber }),
        });

        if (locRes.ok) {
          const data = await locRes.json();
          locations.push({ partNumber: item.partNumber, location: data.location });
        }
      }

      // Update Excel in background (don't wait)
      for (const item of batchItems) {
        fetch("/api/updateActualCount", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ partNumber: item.partNumber, quantityChange: item.quantity }),
        }).catch(error => console.error("Failed to update Excel:", error));
      }

      // Store batch locations for display
      setBatchItems([]);
      setIsPartNumberSubmitted(true);
      setIsQuantitySubmitted(true);
      
      // Create location summary
      const locationSummary = locations.map(l => `${l.partNumber}: ${l.location}`).join("\n");
      setLocation(locationSummary);
    } catch (error) {
      console.error("Error processing batch:", error);
      alert("Error processing batch");
    } finally {
      setIsProcessingBatch(false);
    }
  };

  // -------- Text scanning (camera + upload) for batch entry --------
  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    setIsCameraActive(false);
  };

  const startCamera = async () => {
    setScanError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error("Camera error", err);
      setScanError("Unable to access camera. Please check permissions or use Upload.");
    }
  };

  const applyScanResults = (tokens: string[]) => {
    setScanResults(tokens);
    if (tokens.length > 0) {
      setCurrentBatchPart(tokens[0]);
      setScanError("");
    } else {
      setScanError("No clear text found. Try a closer photo or better lighting.");
    }
  };

  const captureFromCamera = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement("canvas");
    canvasRef.current = canvas;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);

    setIsScanningImage(true);
    try {
      const tokens = await scanPartNumbersFromCanvas(canvas);
      applyScanResults(tokens);
    } catch (err) {
      console.error("Scan error", err);
      setScanError("Scan failed. Please try again.");
    } finally {
      setIsScanningImage(false);
    }
  };

  const handleBatchImageUpload = async (file: File | null) => {
    if (!file) return;
    setIsScanningImage(true);
    setScanError("");
    try {
      const tokens = await scanPartNumbersFromBlob(file);
      applyScanResults(tokens);
    } catch (err) {
      console.error("Upload scan error", err);
      setScanError("Could not read that image. Try a clearer photo.");
    } finally {
      setIsScanningImage(false);
    }
  };

  const openScanModal = () => {
    setScanResults([]);
    setScanError("");
    setIsScanModalOpen(true);
  };

  const closeScanModal = () => {
    stopCamera();
    setIsScanModalOpen(false);
  };

  if (!isPartNumberSubmitted) {
    if (batchMode) {
      return (
        <>
          <div className="p-4">
            <div className="max-w-2xl mx-auto mt-12 border rounded-lg p-6 bg-gray-50">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Batch Entry Mode</h2>
              <button
                onClick={handleChangeUser}
                className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Change User
              </button>
            </div>
            <p className="mb-4 text-sm text-gray-900">
              Welcome, <span className="font-semibold">{userName}</span>! {" "}
              <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                userRole === "admin" ? "bg-purple-200 text-purple-800" : "bg-blue-200 text-blue-800"
              }`}>
                {userRole.toUpperCase()}
              </span>
              <br />Add multiple items to process together.
            </p>

            {batchItems.length > 0 && (
              <div className="mb-4 p-3 bg-white border rounded">
                <h3 className="font-semibold mb-2">Items to process ({batchItems.length}):</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {batchItems.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm font-medium flex-shrink-0 w-32">{item.partNumber}</span>
                      {userRole !== "viewer" && (
                        <input
                          type="text"
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...batchItems];
                            newItems[index].quantity = e.target.value;
                            setBatchItems(newItems);
                          }}
                          placeholder="+5 or -3"
                          className="flex-1 px-2 py-1 text-sm border rounded"
                        />
                      )}
                      <button
                        onClick={() => handleRemoveFromBatch(index)}
                        className="text-red-500 hover:text-red-700 text-sm font-semibold flex-shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="block mb-2 font-semibold">Part Number:</label>
              <div className="relative mb-3">
                <input
                  type="text"
                  value={currentBatchPart}
                  onChange={(e) => {
                    setCurrentBatchPart(e.target.value);
                    setShowSuggestions(true);
                    searchPartNumbers(e.target.value);
                  }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="Enter part number"
                  className="w-full px-3 py-2 border rounded"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setCurrentBatchPart(suggestion);
                          setShowSuggestions(false);
                        }}
                        className="px-3 py-2 hover:bg-blue-100 cursor-pointer border-b last:border-b-0"
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => { openScanModal(); startCamera(); }}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700"
                >
                  Scan with Camera
                </button>
                <label className="flex-1">
                  <span className="block w-full px-3 py-2 bg-gray-200 text-gray-800 text-center rounded font-semibold hover:bg-gray-300 cursor-pointer">
                    Upload Image
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      handleBatchImageUpload(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>

              {scanResults.length > 0 && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="font-semibold text-sm text-blue-900 mb-2">Tap a scanned part number:</p>
                  <div className="flex flex-wrap gap-2">
                    {scanResults.slice(0, 6).map((token) => (
                      <button
                        key={token}
                        onClick={() => setCurrentBatchPart(token)}
                        className="px-3 py-1 bg-white border border-blue-200 rounded hover:bg-blue-100 text-sm font-semibold"
                      >
                        {token}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {scanError && (
                <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                  {scanError}
                </div>
              )}

              {userRole !== "viewer" && (
                <>
                  <label className="block mb-2 font-semibold">Quantity (+/-)</label>
                  <input
                    type="text"
                    value={currentBatchQty}
                    onChange={(e) => setCurrentBatchQty(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAddToBatch();
                      }
                    }}
                    placeholder="+5 or -3"
                    className="w-full px-3 py-2 border rounded mb-3"
                  />
                </>
              )}

              <button
                onClick={handleAddToBatch}
                disabled={userRole === "viewer" ? !currentBatchPart.trim() : (!currentBatchPart.trim() || !currentBatchQty.trim())}
                className="w-full px-3 py-2 bg-green-500 text-white rounded font-semibold disabled:bg-gray-400"
              >
                Add to List
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setBatchMode(false)}
                className="flex-1 px-3 py-2 bg-gray-500 text-white rounded font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitBatch}
                disabled={batchItems.length === 0 || isProcessingBatch}
                className="flex-1 px-3 py-2 bg-blue-500 text-white rounded font-semibold disabled:bg-gray-400"
              >
                {isProcessingBatch ? "Processing..." : `Submit All (${batchItems.length})`}
              </button>
            </div>
          </div>
        </div>

        {isScanModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold text-gray-900">Text Scan</h3>
                <button onClick={closeScanModal} className="text-gray-600 hover:text-gray-800 font-semibold">✕</button>
              </div>
              <div className="space-y-3">
                <div className="rounded-lg overflow-hidden border border-gray-200 bg-black/5">
                  <video ref={videoRef} className="w-full h-64 bg-black" autoPlay muted playsInline />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={startCamera}
                    className="flex-1 px-3 py-2 bg-gray-200 text-gray-800 rounded font-semibold hover:bg-gray-300"
                  >
                    Enable Camera
                  </button>
                  <button
                    onClick={captureFromCamera}
                    disabled={!isCameraActive || isScanningImage}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded font-semibold disabled:bg-gray-400"
                  >
                    {isScanningImage ? "Scanning..." : "Capture & Scan"}
                  </button>
                  <button
                    onClick={closeScanModal}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded font-semibold hover:bg-gray-200"
                  >
                    Close
                  </button>
                </div>
                <p className="text-sm text-gray-600">Tip: Hold the label close, ensure good light, and keep text horizontal.</p>
                {scanResults.length > 0 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="font-semibold text-sm text-blue-900 mb-2">Detected:</p>
                    <div className="flex flex-wrap gap-2">
                      {scanResults.slice(0, 8).map((token) => (
                        <button
                          key={token}
                          onClick={() => { setCurrentBatchPart(token); closeScanModal(); }}
                          className="px-3 py-1 bg-white border border-blue-200 rounded hover:bg-blue-100 text-sm font-semibold"
                        >
                          {token}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {scanError && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">{scanError}</div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="batch-upload-hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    handleBatchImageUpload(file);
                    e.target.value = "";
                  }}
                />
                <label htmlFor="batch-upload-hidden" className="block w-full">
                  <span className="block w-full text-center px-3 py-2 bg-gray-200 text-gray-800 rounded font-semibold hover:bg-gray-300 cursor-pointer">
                    Or Upload Image Instead
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}
        </>
      );
    }

    return (
      <div className="p-4">
        <div className="max-w-md mx-auto mt-12 border rounded-lg p-6 bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Part Number</h2>
            <div className="flex gap-2">
              {userRole === "admin" && (
                <a
                  href="/view"
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
                >
                  📊 View
                </a>
              )}
              <button
                onClick={handleChangeUser}
                className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Change User
              </button>
            </div>
          </div>
          <p className="mb-4 text-sm text-gray-900">
            Welcome, <span className="font-semibold">{userName}</span>! {" "}
            <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
              userRole === "admin" ? "bg-purple-200 text-purple-800" : "bg-blue-200 text-blue-800"
            }`}>
              {userRole.toUpperCase()}
            </span>
          </p>
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-900">
              💡 <span className="font-semibold">Tip:</span> Need to process multiple items?
              <button
                onClick={() => setBatchMode(true)}
                className="ml-2 text-blue-600 underline font-semibold"
              >
                Switch to Batch Mode
              </button>
            </p>
          </div>
          <div className="mb-2">
            <label className="font-semibold">What part number do you want to take out?</label>
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
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
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
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectSuggestion(suggestion);
                      }}
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
      </div>
    );
  }

  if (!isQuantitySubmitted) {
    return (
      <div className="p-4">
        <div className="max-w-md mx-auto mt-12 border rounded-lg p-6 bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Current Stock</h2>
            <button
              onClick={() => {
                setIsPartNumberSubmitted(false);
                setPartNumber("");
                setActualCount("");
                setNewQuantity("");
              }}
              className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              ← Back
            </button>
          </div>
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
      {location && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="max-w-2xl w-full p-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl shadow-2xl">
            <h2 className="text-3xl font-bold text-white text-center mb-6">
              {location.includes("\n") ? "Locations" : "Location"}
            </h2>
            <div className="bg-white rounded-xl p-8">
              {location.includes("\n") ? (
                <div className="space-y-3">
                  {location.split("\n").map((line, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded">
                      <p className="text-2xl font-bold text-gray-900">{line}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-6xl font-black text-gray-900 break-words text-center">{location}</p>
              )}
            </div>
            {!location.includes("\n") && partNumber && (
              <p className="text-white text-center mt-6 text-lg">Part: {partNumber}</p>
            )}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  // Reset to part number question (keep username)
                  setPartNumber("");
                  setIsPartNumberSubmitted(false);
                  setNewQuantity("");
                  setIsQuantitySubmitted(false);
                  setLocation("");
                  setActualCount("");
                }}
                className="flex-1 px-6 py-3 bg-white text-blue-700 font-bold rounded-xl hover:bg-gray-100 transition-colors"
              >
                🏠 Home
              </button>
              {(userRole === "admin" || userRole === "viewer") && (
                <a
                  href="/view"
                  className="flex-1 px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors text-center"
                >
                  📊 View Records
                </a>
              )}
            </div>
          </div>
        </div>
      )}
      {!location && (
        <>
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
        </>
      )}
    </div>
  );
}
