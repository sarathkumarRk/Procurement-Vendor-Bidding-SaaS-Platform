import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  Users as UsersIcon,
  Plus,
  Pencil,
  Trash2,
  X,
  RefreshCw,
} from "lucide-react";
import API from "../../api/axios";

const initialForm = {
  name: "",
  email: "",
  password: "",
  role: "VENDOR",
  department_id: "",
  is_active: true,
};

const roles = [
  "ADMIN",
  "PROCUREMENT_MANAGER",
  "VENDOR",
  "APPROVER",
];

function Users() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [page, setPage] = useState(1);
  const limit = 10;
  const [hasMore, setHasMore] = useState(false);

  const [form, setForm] = useState({ ...initialForm });

  const fetchUsers = async (currentPage = page) => {
    try {
      setLoading(true);

      const response = await API.get("/users/", {
        params: {
          page: currentPage,
          limit,
        },
      });

      const data = response.data;
      setUsers(Array.isArray(data) ? data : data.items || data.users || []);
      setHasMore(
        (Array.isArray(data) ? data : data.items || data.users || []).length === limit
      );
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Failed to load users."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await API.get("/departments/", {
        params: {
          page: 1,
          limit: 100,
        },
      });

      const data = response.data;
      setDepartments(
        Array.isArray(data) ? data : data.items || data.departments || []
      );
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Failed to load departments."
      );
    }
  };

  useEffect(() => {
    fetchUsers(page);
  }, [page]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const resetForm = () => {
    setForm({ ...initialForm });
    setEditingId(null);
    setShowForm(false);
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (user) => {
    setEditingId(user.id);

    setForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role || "VENDOR",
      department_id: user.department_id ?? "",
      is_active: user.is_active ?? true,
    });

    setShowForm(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required.");
      return;
    }

    if (editingId === null && !form.password) {
      toast.error("Password is required for a new user.");
      return;
    }

    if (form.password && form.password.length < 3) {
      toast.error("Password must contain at least 3 characters.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      department_id:
        form.department_id === ""
          ? null
          : Number(form.department_id),
      is_active: form.is_active,
    };

    if (form.password) {
      payload.password = form.password;
    }

    try {
      setSaving(true);

      if (editingId !== null) {
        await API.put(`/users/${editingId}`, payload);
        toast.success("User updated successfully!");
      } else {
        await API.post("/users/", payload);
        toast.success("User created successfully!");
      }

      resetForm();
      await fetchUsers(page);
    } catch (error) {
      const detail = error.response?.data?.detail;

      toast.error(
        typeof detail === "string"
          ? detail
          : `Failed to ${editingId !== null ? "update" : "create"} user.`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${user.name}?`
    );

    if (!confirmed) return;

    try {
      setDeletingId(user.id);

      await API.delete(`/users/${user.id}`);

      toast.success("User deleted successfully!");

      if (users.length === 1 && page > 1) {
        setPage((previous) => previous - 1);
      } else {
        await fetchUsers(page);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Failed to delete user."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const formatRole = (role) => {
    if (!role) return "Unknown";

    return role
      .split("_")
      .map(
        (word) => word.charAt(0) + word.slice(1).toLowerCase()
      )
      .join(" ");
  };

  return (
    <div className="min-h-screen bg-[#f5eee7] p-4 text-[#54331f] sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <UsersIcon size={30} className="text-[#6f452c]" />

            <div>
              <h1 className="text-2xl font-bold text-[#6f452c] sm:text-3xl">
                User Management
              </h1>

              <p className="mt-1 text-sm text-[#8b6a52]">
                Create, update and manage platform users.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                fetchUsers(page);
                fetchDepartments();
              }}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-[#c9ad98] bg-white px-4 py-2.5 font-medium text-[#6f452c] hover:bg-[#eadbcf] disabled:opacity-60"
            >
              <RefreshCw size={17} />
              Refresh
            </button>

            <button
              type="button"
              onClick={handleCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-[#6f452c] px-4 py-2.5 font-semibold text-white hover:bg-[#54331f]"
            >
              <Plus size={18} />
              Add User
            </button>
          </div>
        </div>

        {showForm && (
          <div className="mb-6 rounded-xl border border-[#d6c0ad] bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#6f452c]">
                {editingId !== null ? "Update User" : "Create User"}
              </h2>

              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                aria-label="Close form"
                className="rounded-lg p-2 text-[#6f452c] hover:bg-[#f5eee7] disabled:opacity-60"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="user-name"
                    className="mb-2 block text-sm font-semibold text-[#6f452c]"
                  >
                    Full Name *
                  </label>

                  <input
                    id="user-name"
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    maxLength={100}
                    required
                    placeholder="Enter full name"
                    className="w-full rounded-lg border border-[#d6c0ad] px-4 py-3 outline-none focus:border-[#6f452c] focus:ring-2 focus:ring-[#d6c0ad]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="user-email"
                    className="mb-2 block text-sm font-semibold text-[#6f452c]"
                  >
                    Email Address *
                  </label>

                  <input
                    id="user-email"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder="Enter email address"
                    autoComplete="email"
                    className="w-full rounded-lg border border-[#d6c0ad] px-4 py-3 outline-none focus:border-[#6f452c] focus:ring-2 focus:ring-[#d6c0ad]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="user-password"
                    className="mb-2 block text-sm font-semibold text-[#6f452c]"
                  >
                    Password {editingId === null ? "*" : "(Optional)"}
                  </label>

                  <input
                    id="user-password"
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    minLength={3}
                    required={editingId === null}
                    autoComplete="new-password"
                    placeholder={
                      editingId !== null
                        ? "Leave blank to keep current password"
                        : "Minimum 3 characters"
                    }
                    className="w-full rounded-lg border border-[#d6c0ad] px-4 py-3 outline-none focus:border-[#6f452c] focus:ring-2 focus:ring-[#d6c0ad]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="user-role"
                    className="mb-2 block text-sm font-semibold text-[#6f452c]"
                  >
                    User Role *
                  </label>

                  <select
                    id="user-role"
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-[#d6c0ad] bg-white px-4 py-3 outline-none focus:border-[#6f452c] focus:ring-2 focus:ring-[#d6c0ad]"
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {formatRole(role)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="user-department"
                    className="mb-2 block text-sm font-semibold text-[#6f452c]"
                  >
                    Department
                  </label>

                  <select
                    id="user-department"
                    name="department_id"
                    value={form.department_id}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-[#d6c0ad] bg-white px-4 py-3 outline-none focus:border-[#6f452c] focus:ring-2 focus:ring-[#d6c0ad]"
                  >
                    <option value="">No Department</option>

                    {departments.map((department) => (
                      <option
                        key={department.id}
                        value={department.id}
                      >
                        {department.name}
                      </option>
                    ))}
                  </select>
                </div>

                {editingId !== null && (
                  <div className="flex items-center gap-3 self-end rounded-lg border border-[#d6c0ad] p-3">
                    <input
                      id="user-active"
                      type="checkbox"
                      name="is_active"
                      checked={form.is_active}
                      onChange={handleChange}
                      className="h-4 w-4 accent-[#6f452c]"
                    />

                    <label
                      htmlFor="user-active"
                      className="text-sm font-semibold text-[#6f452c]"
                    >
                      Account Active
                    </label>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#6f452c] px-5 py-2.5 font-semibold text-white hover:bg-[#54331f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingId !== null
                      ? "Update User"
                      : "Create User"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className="rounded-lg border border-[#c9ad98] px-5 py-2.5 font-semibold text-[#6f452c] hover:bg-[#f5eee7] disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-[#d6c0ad] bg-white shadow-sm">
          <div className="border-b border-[#eadbcf] px-5 py-4">
            <h2 className="font-bold text-[#6f452c]">
              Registered Users
            </h2>
          </div>

          {loading ? (
            <div className="p-10 text-center text-[#8b6a52]">
              Loading users...
            </div>
          ) : users.length === 0 ? (
            <div className="p-10 text-center">
              <UsersIcon
                size={40}
                className="mx-auto mb-3 text-[#8b6a52]"
              />

              <h3 className="font-semibold text-[#6f452c]">
                No users found
              </h3>

              <p className="mt-1 text-sm text-[#8b6a52]">
                Add a user to get started.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px] text-left">
                  <thead className="bg-[#f5eee7]">
                    <tr>
                      <th className="px-5 py-3 text-sm font-semibold text-[#6f452c]">
                        ID
                      </th>
                      <th className="px-5 py-3 text-sm font-semibold text-[#6f452c]">
                        Name
                      </th>
                      <th className="px-5 py-3 text-sm font-semibold text-[#6f452c]">
                        Email
                      </th>
                      <th className="px-5 py-3 text-sm font-semibold text-[#6f452c]">
                        Role
                      </th>
                      <th className="px-5 py-3 text-sm font-semibold text-[#6f452c]">
                        Department
                      </th>
                      <th className="px-5 py-3 text-sm font-semibold text-[#6f452c]">
                        Status
                      </th>
                      <th className="px-5 py-3 text-right text-sm font-semibold text-[#6f452c]">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#eadbcf]">
                    {users.map((user) => {
                      const department = departments.find(
                        (item) => item.id === user.department_id
                      );

                      return (
                        <tr
                          key={user.id}
                          className="transition hover:bg-[#fcf9f6]"
                        >
                          <td className="px-5 py-4 text-sm">
                            {user.id}
                          </td>

                          <td className="px-5 py-4 text-sm font-semibold text-[#6f452c]">
                            {user.name}
                          </td>

                          <td className="px-5 py-4 text-sm">
                            {user.email}
                          </td>

                          <td className="px-5 py-4 text-sm">
                            {formatRole(user.role)}
                          </td>

                          <td className="px-5 py-4 text-sm">
                            {department?.name || "Not assigned"}
                          </td>

                          <td className="px-5 py-4 text-sm">
                            {user.is_active ? "Active" : "Inactive"}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleEdit(user)}
                                title="Edit user"
                                aria-label={`Edit ${user.name}`}
                                className="rounded-lg border border-[#d6c0ad] p-2 text-[#6f452c] hover:bg-[#eadbcf]"
                              >
                                <Pencil size={17} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDelete(user)}
                                disabled={deletingId === user.id}
                                title="Delete user"
                                aria-label={`Delete ${user.name}`}
                                className="rounded-lg border border-[#d6c0ad] p-2 text-[#6f452c] hover:bg-[#eadbcf] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {deletingId === user.id ? (
                                  <span className="text-xs">...</span>
                                ) : (
                                  <Trash2 size={17} />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-[#eadbcf] px-5 py-4">
                <button
                  type="button"
                  onClick={() => setPage((current) => current - 1)}
                  disabled={page === 1 || loading}
                  className="rounded-lg border border-[#c9ad98] px-4 py-2 text-sm font-semibold text-[#6f452c] hover:bg-[#f5eee7] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <span className="text-sm text-[#8b6a52]">
                  Page {page}
                </span>

                <button
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={!hasMore || loading}
                  className="rounded-lg border border-[#c9ad98] px-4 py-2 text-sm font-semibold text-[#6f452c] hover:bg-[#f5eee7] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>

        <p className="mt-4 text-sm text-[#8b6a52]">
          Note: Only administrators can create, update and delete users.
        </p>
      </div>
    </div>
  );
}

export default Users;