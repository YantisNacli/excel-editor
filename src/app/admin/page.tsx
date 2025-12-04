"use client";

import { useState, useEffect } from "react";

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
  updated_at: string;
};

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("operator");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    // Check if user is admin
    const userRole = localStorage.getItem('stockTrackerUserRole');
    const userEmail = localStorage.getItem('stockTrackerUserEmail');
    
    if (userRole === 'admin') {
      setIsAdmin(true);
      fetchUsers();
    } else {
      setIsAdmin(false);
    }
    setCheckingAuth(false);
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/listUsers");
      const data = await response.json();

      if (response.ok) {
        setUsers(data.users || []);
      } else {
        setError(`Failed to fetch users: ${data.error}`);
      }
    } catch (err) {
      setError("Failed to fetch users");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (email: string, newRole: string) => {
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/updateUserRole", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newRole }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ Updated ${email} to ${newRole}`);
        fetchUsers();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setError(`❌ ${data.error}`);
      }
    } catch (err) {
      setError("❌ Failed to update role");
      console.error(err);
    }
  };

  const handleDeleteUser = async (email: string) => {
    if (!confirm(`Are you sure you want to delete user "${email}"?`)) {
      return;
    }

    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/deleteUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ Deleted user ${email}`);
        fetchUsers();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setError(`❌ ${data.error}`);
      }
    } catch (err) {
      setError("❌ Failed to delete user");
      console.error(err);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!newEmail.trim() || !newName.trim()) {
      setError("❌ Email and name are required");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/createUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: newEmail.trim(), 
          name: newName.trim(), 
          role: newRole 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ Created user ${newEmail} (${newName})`);
        setShowCreateForm(false);
        setNewEmail("");
        setNewName("");
        setNewRole("operator");
        fetchUsers();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setError(`❌ ${data.error}`);
      }
    } catch (err) {
      setError("❌ Failed to create user");
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

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
          <h1 className="text-2xl font-bold text-red-900 mb-4">🚫 Access Denied</h1>
          <p className="text-red-800 mb-6">
            You need admin privileges to access this page.
          </p>
          <div className="flex gap-4">
            <a
              href="/"
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold text-center"
            >
              ← Go Home
            </a>
            <a
              href="/view"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-center"
            >
              View Records
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <a
              href="/view"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-semibold"
            >
              ← Back to View
            </a>
            <h1 className="text-2xl font-bold text-gray-900">👥 User Management</h1>
          </div>
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold disabled:bg-gray-400"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {message && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-medium">{message}</p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">All Users ({users.length})</h2>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold"
            >
              {showCreateForm ? "Cancel" : "+ Add User"}
            </button>
          </div>

          {showCreateForm && (
            <form onSubmit={handleCreateUser} className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4 text-green-900">Create New User</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700">Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-3 py-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700">Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-3 py-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700">Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="operator">Operator</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={isCreating}
                className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold disabled:bg-gray-400"
              >
                {isCreating ? "Creating..." : "Create User"}
              </button>
            </form>
          )}

          <div className="mb-4 flex gap-2 text-xs">
            <span className="px-2 py-1 bg-gray-200 text-gray-800 rounded font-semibold">VIEWER = Read-only</span>
            <span className="px-2 py-1 bg-blue-200 text-blue-800 rounded font-semibold">OPERATOR = Transactions</span>
            <span className="px-2 py-1 bg-purple-200 text-purple-800 rounded font-semibold">ADMIN = Full Access</span>
          </div>

          {loading ? (
            <p className="text-gray-600 text-center py-8">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="text-gray-600 text-center py-8">No users found</p>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div key={user.id} className="bg-white p-4 rounded-lg border border-gray-300 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-lg font-bold text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${
                        user.role === "admin" ? "bg-purple-200 text-purple-800" :
                        user.role === "operator" ? "bg-blue-200 text-blue-800" :
                        "bg-gray-200 text-gray-800"
                      }`}>
                        {user.role.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Created: {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <select
                      value={user.role}
                      onChange={(e) => handleUpdateRole(user.email, e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="operator">Operator</option>
                      <option value="admin">Admin</option>
                    </select>

                    <button
                      onClick={() => handleDeleteUser(user.email)}
                      className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm font-semibold"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-3">ℹ️ User Role Permissions:</h3>
          <ul className="list-disc list-inside text-blue-800 space-y-2 text-sm">
            <li><strong>Viewer:</strong> Can only view records and inventory. Cannot perform transactions.</li>
            <li><strong>Operator:</strong> Can perform stock transactions (add/remove items) and view records.</li>
            <li><strong>Admin:</strong> Full access including user management, inventory management, imports, and all operator functions.</li>
          </ul>
          <p className="mt-4 text-xs text-blue-700">
            ⚠️ Only users with whitelisted emails can access the system. Use the "Add User" button to authorize new users.
          </p>
        </div>
      </div>
    </div>
  );
}
