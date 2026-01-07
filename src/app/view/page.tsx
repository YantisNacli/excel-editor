"use client";

import React, { useState, useEffect } from "react";

type DataRow = {
  id: number;
  date: string;
  time: string;
  name: string;
  partNumber: string;
  quantity: string;
};

export default function ViewPage() {
  const [data, setData] = useState<DataRow[]>([]);
  const [filteredData, setFilteredData] = useState<DataRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterColumn, setFilterColumn] = useState<"all" | "name" | "partNumber" | "quantity">("all");
  const [dateFilter, setDateFilter] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deleteAllPassword, setDeleteAllPassword] = useState("");
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  useEffect(() => {
    // Check if user is admin
    const userRole = localStorage.getItem('stockTrackerUserRole');
    
    if (userRole === 'admin') {
      setIsAdmin(true);
      fetchData();
    } else {
      setIsAdmin(false);
    }
    setCheckingAuth(false);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/getData");
      if (res.ok) {
        const result = await res.json();
        setData(result.data);
        setFilteredData(result.data);
      } else {
        setError("Failed to load data");
      }
    } catch (err) {
      setError("Error loading data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...data];

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter((row) => {
        const term = searchTerm.toLowerCase();
        if (filterColumn === "all") {
          return (
            row.name.toLowerCase().includes(term) ||
            row.partNumber.toLowerCase().includes(term) ||
            row.quantity.toLowerCase().includes(term)
          );
        } else if (filterColumn === "name") {
          return row.name.toLowerCase().includes(term);
        } else if (filterColumn === "partNumber") {
          return row.partNumber.toLowerCase().includes(term);
        } else if (filterColumn === "quantity") {
          return row.quantity.toLowerCase().includes(term);
        }
        return true;
      });
    }

    // Apply date filter
    if (dateFilter.trim()) {
      filtered = filtered.filter((row) => row.date === dateFilter);
    }

    setFilteredData(filtered);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterColumn("all");
    setDateFilter("");
    setFilteredData(data);
  };

  const handleDelete = async (rowId: number) => {
    if (!confirm("Are you sure you want to delete this entry?")) return;

    try {
      const res = await fetch("/api/deleteRow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowId }),
      });

      if (res.ok) {
        fetchData(); // Refresh the data
      } else {
        alert("Failed to delete entry");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting entry");
    }
  };

  const handleDeleteAll = async () => {
    if (!deleteAllPassword.trim()) {
      alert("Please enter your password");
      return;
    }

    if (!confirm("⚠️ WARNING: This will permanently delete ALL inventory data. This action cannot be undone. Are you absolutely sure?")) return;

    setIsDeletingAll(true);
    try {
      const userEmail = localStorage.getItem('stockTrackerUserEmail');
      const res = await fetch("/api/deleteAll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deleteAllPassword, email: userEmail }),
      });

      const data = await res.json();

      if (res.ok) {
        alert("All data has been deleted successfully");
        setShowDeleteAllModal(false);
        setDeleteAllPassword("");
        fetchData(); // Refresh the data
      } else {
        alert(`Failed to delete all data: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting all data");
    } finally {
      setIsDeletingAll(false);
    }
  };

  useEffect(() => {
    applyFilters();
  }, [searchTerm, filterColumn, dateFilter, data]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-red-900 mb-4">🚫 Admin Access Required</h1>
          <p className="text-red-800 mb-6">
            Only administrators can access this page.
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            ← Go Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-semibold"
            >
              ← Back
            </a>
            <h1 className="text-2xl font-bold">Stock Log</h1>
          </div>
          <div className="flex gap-2">
            <a
              href="/compare"
              className="px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 font-semibold"
            >
              📊 Compare
            </a>
            <a
              href="/manage"
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold"
            >
              🗂️ Manage
            </a>
            <a
              href="/admin"
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 font-semibold"
            >
              👥 Users
            </a>
            <button
              onClick={() => setShowDeleteAllModal(true)}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-semibold"
            >
              🗑️ Delete All
            </button>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Filter Section */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold mb-3">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Column Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search In
              </label>
              <select
                value={filterColumn}
                onChange={(e) => setFilterColumn(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Columns</option>
                <option value="name">Name</option>
                <option value="partNumber">Part Number</option>
                <option value="quantity">Quantity</option>
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Date
              </label>
              <input
                type="text"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                placeholder="MM/DD/YYYY"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold">{filteredData.length}</span> of <span className="font-semibold">{data.length}</span> records
            </p>
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 border-b text-left">Date</th>
                  <th className="px-4 py-2 border-b text-left">Time</th>
                  <th className="px-4 py-2 border-b text-left">Name</th>
                  <th className="px-4 py-2 border-b text-left">Part Number</th>
                  <th className="px-4 py-2 border-b text-left">Quantity</th>
                  <th className="px-4 py-2 border-b text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-2 text-center text-gray-700">
                      {data.length === 0 ? "No data yet" : "No records match your filters"}
                    </td>
                  </tr>
                ) : (
                  filteredData.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 border-b text-gray-900">{row.date}</td>
                      <td className="px-4 py-2 border-b text-gray-900">{row.time}</td>
                      <td className="px-4 py-2 border-b text-gray-900">{row.name}</td>
                      <td className="px-4 py-2 border-b text-gray-900">{row.partNumber}</td>
                      <td className="px-4 py-2 border-b text-gray-900">{row.quantity}</td>
                      <td className="px-4 py-2 border-b">
                        <button
                          onClick={() => handleDelete(row.id)}
                          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete All Modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-red-600 mb-4">⚠️ Delete All Data</h2>
            <p className="text-gray-700 mb-4">
              This action will permanently delete ALL inventory data. This cannot be undone.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter your admin password to confirm:
              </label>
              <input
                type="password"
                value={deleteAllPassword}
                onChange={(e) => setDeleteAllPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Admin password"
                disabled={isDeletingAll}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteAllModal(false);
                  setDeleteAllPassword("");
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                disabled={isDeletingAll}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={isDeletingAll || !deleteAllPassword.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed"
              >
                {isDeletingAll ? "Deleting..." : "Delete All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
