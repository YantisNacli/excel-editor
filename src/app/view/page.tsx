"use client";

import React, { useState, useEffect } from "react";

type DataRow = {
  date: string;
  name: string;
  partNumber: string;
  quantity: string;
};

export default function ViewPage() {
  const [data, setData] = useState<DataRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/getData");
      if (res.ok) {
        const result = await res.json();
        setData(result.data);
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

  const handleDelete = async (rowIndex: number) => {
    if (!confirm("Are you sure you want to delete this entry?")) return;

    try {
      const res = await fetch("/api/deleteRow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowIndex }),
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

  return (
    <div className="p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Stock Tracker</h1>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh
          </button>
        </div>

        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 border-b text-left">Date</th>
                  <th className="px-4 py-2 border-b text-left">Name</th>
                  <th className="px-4 py-2 border-b text-left">Part Number</th>
                  <th className="px-4 py-2 border-b text-left">Quantity</th>
                  <th className="px-4 py-2 border-b text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-2 text-center text-gray-700">
                      No data yet
                    </td>
                  </tr>
                ) : (
                  data.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-2 border-b text-gray-900">{row.date}</td>
                      <td className="px-4 py-2 border-b text-gray-900">{row.name}</td>
                      <td className="px-4 py-2 border-b text-gray-900">{row.partNumber}</td>
                      <td className="px-4 py-2 border-b text-gray-900">{row.quantity}</td>
                      <td className="px-4 py-2 border-b">
                        <button
                          onClick={() => handleDelete(idx)}
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
