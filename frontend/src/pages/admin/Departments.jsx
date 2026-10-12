import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Pencil, Trash2, Plus, X, Building2, RefreshCw } from "lucide-react";
import API from "../../api/axios";

function Departments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
  });

  const [page, setPage] = useState(1);
  const limit = 10;

  const [hasMore, setHasMore] = useState(false);

  const fetchDepartments = async (currentPage = page) => {
    try {
      setLoading(true);

      const response = await API.get("/departments/", {
        params: {
          page: currentPage,
          limit,
        },
      });

      const data = response.data;
      setDepartments(data);
      setHasMore(data.length === limit);
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          "Failed to load departments."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments(page);
  }, [page]);

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  const handleCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (department) => {
    setEditingId(department.id);
    setForm({
      name: department.name || "",
      description: department.description || "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const name = form.name.trim();
    const description = form.description.trim();

    if (!name) {
      toast.error("Department name is required.");
      return;
    }

    const payload = {
      name,
      description: description || null,
    };

    try {
      setSaving(true);

      if (editingId !== null) {
        await API.put(`/departments/${editingId}`, payload);
        toast.success("Department updated successfully!");
      } else {
        await API.post("/departments/", payload);
        toast.success("Department created successfully!");
      }

      resetForm();
      await fetchDepartments(page);
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          `Failed to ${editingId !== null ? "update" : "create"} department.`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (department) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${department.name}"?`
    );

    if (!confirmed) return;

    try {
      setDeletingId(department.id);

      await API.delete(`/departments/${department.id}`);

      toast.success("Department deleted successfully!");

      if (departments.length === 1 && page > 1) {
        setPage((currentPage) => currentPage - 1);
      } else {
        await fetchDepartments(page);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          "Failed to delete department."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleRefresh = () => {
    fetchDepartments(page);
  };

  return (
    <div className="min-h-screen bg-[#f5eee7] p-4 text-[#54331f] sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-3">
              <Building2 size={30} className="text-[#6f452c]" />

              <h1 className="text-2xl font-bold text-[#6f452c] sm:text-3xl">
                Departments
              </h1>
            </div>

            <p className="mt-2 text-sm text-[#8b6a52]">
              Create and manage company departments.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#c9ad98] bg-white px-4 py-2.5 font-medium text-[#6f452c] transition hover:bg-[#eadbcf] disabled:opacity-60"
            >
              <RefreshCw size={17} />
              Refresh
            </button>

            <button
              type="button"
              onClick={handleCreate}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#6f452c] px-4 py-2.5 font-semibold text-white transition hover:bg-[#54331f]"
            >
              <Plus size={18} />
              Add Department
            </button>
          </div>
        </div>

        {/* Create / Edit Form */}
        {showForm && (
          <div className="mb-6 rounded-xl border border-[#d6c0ad] bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-[#6f452c]">
                {editingId !== null
                  ? "Update Department"
                  : "Create Department"}
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
              <div>
                <label
                  htmlFor="department-name"
                  className="mb-2 block text-sm font-semibold text-[#6f452c]"
                >
                  Department Name *
                </label>

                <input
                  id="department-name"
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter department name"
                  maxLength={100}
                  required
                  className="w-full rounded-lg border border-[#d6c0ad] px-4 py-3 outline-none focus:border-[#6f452c] focus:ring-2 focus:ring-[#d6c0ad]"
                />
              </div>

              <div>
                <label
                  htmlFor="department-description"
                  className="mb-2 block text-sm font-semibold text-[#6f452c]"
                >
                  Description
                </label>

                <textarea
                  id="department-description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Enter department description"
                  rows={3}
                  className="w-full resize-y rounded-lg border border-[#d6c0ad] px-4 py-3 outline-none focus:border-[#6f452c] focus:ring-2 focus:ring-[#d6c0ad]"
                />
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#6f452c] px-5 py-2.5 font-semibold text-white transition hover:bg-[#54331f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingId !== null
                      ? "Update Department"
                      : "Create Department"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className="rounded-lg border border-[#c9ad98] px-5 py-2.5 font-semibold text-[#6f452c] transition hover:bg-[#f5eee7] disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Department Table */}
        <div className="overflow-hidden rounded-xl border border-[#d6c0ad] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#eadbcf] px-5 py-4">
            <h2 className="font-bold text-[#6f452c]">
              Department List
            </h2>

            <span className="rounded-full bg-[#f5eee7] px-3 py-1 text-sm font-medium text-[#6f452c]">
              Page {page}
            </span>
          </div>

          {loading ? (
            <div className="p-10 text-center text-[#8b6a52]">
              Loading departments...
            </div>
          ) : departments.length === 0 ? (
            <div className="p-10 text-center">
              <Building2
                size={40}
                className="mx-auto mb-3 text-[#8b6a52]"
              />

              <h3 className="font-semibold text-[#6f452c]">
                No departments found
              </h3>

              <p className="mt-1 text-sm text-[#8b6a52]">
                Click Add Department to create your first department.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-left">
                  <thead className="bg-[#f5eee7]">
                    <tr>
                      <th className="px-5 py-3 text-sm font-semibold text-[#6f452c]">
                        ID
                      </th>

                      <th className="px-5 py-3 text-sm font-semibold text-[#6f452c]">
                        Department Name
                      </th>

                      <th className="px-5 py-3 text-sm font-semibold text-[#6f452c]">
                        Description
                      </th>

                      <th className="px-5 py-3 text-right text-sm font-semibold text-[#6f452c]">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#eadbcf]">
                    {departments.map((department) => (
                      <tr
                        key={department.id}
                        className="transition hover:bg-[#fcf9f6]"
                      >
                        <td className="px-5 py-4 text-sm">
                          {department.id}
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-[#6f452c]">
                          {department.name}
                        </td>

                        <td className="max-w-sm px-5 py-4 text-sm text-[#8b6a52]">
                          {department.description || "No description"}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(department)}
                              title="Edit department"
                              aria-label={`Edit ${department.name}`}
                              className="rounded-lg border border-[#d6c0ad] p-2 text-[#6f452c] transition hover:bg-[#eadbcf]"
                            >
                              <Pencil size={17} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(department)}
                              disabled={deletingId === department.id}
                              title="Delete department"
                              aria-label={`Delete ${department.name}`}
                              className="rounded-lg border border-[#d6c0ad] p-2 text-[#6f452c] transition hover:bg-[#eadbcf] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deletingId === department.id ? (
                                <span className="text-xs">...</span>
                              ) : (
                                <Trash2 size={17} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between gap-3 border-t border-[#eadbcf] px-5 py-4">
                <button
                  type="button"
                  onClick={() => setPage((current) => current - 1)}
                  disabled={page === 1 || loading}
                  className="rounded-lg border border-[#c9ad98] px-4 py-2 text-sm font-semibold text-[#6f452c] transition hover:bg-[#f5eee7] disabled:cursor-not-allowed disabled:opacity-40"
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
                  className="rounded-lg border border-[#c9ad98] px-4 py-2 text-sm font-semibold text-[#6f452c] transition hover:bg-[#f5eee7] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>

        {/* Access Information */}
        <p className="mt-4 text-sm text-[#8b6a52]">
          Note: Creating, updating, and deleting departments require Admin access.
        </p>
      </div>
    </div>
  );
}

export default Departments;