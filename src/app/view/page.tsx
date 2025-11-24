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

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, filterColumn, dateFilter, data]);

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
            <h1 className="text-2xl font-bold">Stock Tracker</h1>
          </div>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh
          </button>
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
    </div>
  );
}
