import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  Store,
  Plus,
  Pencil,
  X,
  RefreshCw,
  ShieldCheck,
  Search,
} from "lucide-react";
import API from "../../api/axios";

const initialForm = {
  company_name: "",
  contact_name: "",
  email: "",
  password: "",
  phone: "",
  address: "",
  gst_number: "",
};

function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({ ...initialForm });
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const limit = 10;
  const [hasMore, setHasMore] = useState(false);

  const fetchVendors = async (currentPage = page, status = statusFilter) => {
    try {
      setLoading(true);

      const params = {
        page: currentPage,
        limit,
      };

      if (status) {
        params.verification_status = status;
      }

      const response = await API.get("/vendors/", { params });

      setVendors(response.data);
      setHasMore(response.data.length === limit);
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Failed to load vendors."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors(page, statusFilter);
  }, [page, statusFilter]);

  const resetForm = () => {
    setForm({ ...initialForm });
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

  const handleEdit = (vendor) => {
    setEditingId(vendor.id);

    setForm({
      company_name: vendor.company_name || "",
      contact_name: vendor.contact_name || "",
      email: vendor.email || vendor.user?.email || "",
      password: "",
      phone: vendor.phone || "",
      address: vendor.address || "",
      gst_number: vendor.gst_number || "",
    });

    setShowForm(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      !form.company_name.trim() ||
      !form.contact_name.trim()
    ) {
      toast.error("Company name and contact name are required.");
      return;
    }

    if (editingId === null && !form.email.trim()) {
      toast.error("Email address is required.");
      return;
    }

    if (editingId === null && !form.password) {
      toast.error("Password is required for a new vendor.");
      return;
    }

    if (form.password && form.password.length < 8) {
      toast.error("Password must contain at least 8 characters.");
      return;
    }

    try {
      setSaving(true);

      if (editingId === null) {
        const payload = {
          company_name: form.company_name.trim(),
          contact_name: form.contact_name.trim(),
          email: form.email.trim(),
          password: form.password,
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          gst_number: form.gst_number.trim(),
        };

        await API.post("/vendors/", payload);
        toast.success("Vendor created successfully!");
      } else {
        // VendorUpdate must allow these profile fields.
        // Email and password are not changed by this endpoint.
        const payload = {
          company_name: form.company_name.trim(),
          contact_name: form.contact_name.trim(),
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
        };

        await API.put(`/vendors/${editingId}`, payload);
        toast.success("Vendor profile updated successfully!");
      }

      resetForm();
      await fetchVendors(page, statusFilter);
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          `Failed to ${editingId === null ? "create" : "update"} vendor.`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleVerification = async (vendor, status) => {
    const action = status === "VERIFIED" ? "verify" : "reject";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${vendor.company_name}?`
    );

    if (!confirmed) return;

    try {
      setProcessingId(vendor.id);

      await API.post(`/vendors/${vendor.id}/verify`, {
        status,
      });

      toast.success(
        status === "VERIFIED"
          ? "Vendor verified successfully!"
          : "Vendor rejected successfully!"
      );

      await fetchVendors(page, statusFilter);
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          `Failed to ${action} vendor.`
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleFilterChange = (event) => {
    setPage(1);
    setStatusFilter(event.target.value);
  };

  const statusClass = (status) => {
    switch (status) {
      case "VERIFIED":
        return "border border-[#b49a82] bg-[#eadbcf] text-[#54331f]";
      case "REJECTED":
        return "border border-[#c9ad98] bg-[#f5eee7] text-[#6f452c]";
      default:
        return "border border-[#d6c0ad] bg-white text-[#8b6a52]";
    }
  };

  return (
    <div className="min-h-screen bg-[#f5eee7] p-4 text-[#54331f] sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <Store size={30} className="text-[#6f452c]" />

            <div>
              <h1 className="text-2xl font-bold text-[#6f452c] sm:text-3xl">
                Vendor Management
              </h1>

              <p className="mt-1 text-sm text-[#8b6a52]">
                Manage vendor profiles and verification requests.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => fetchVendors(page, statusFilter)}
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
              Add Vendor
            </button>
          </div>
        </div>

        {/* Create / Edit Form */}
        {showForm && (
          <div className="mb-6 rounded-xl border border-[#d6c0ad] bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#6f452c]">
                {editingId === null ? "Create Vendor" : "Edit Vendor"}
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
                    htmlFor="company_name"
                    className="mb-2 block text-sm font-semibold text-[#6f452c]"
                  >
                    Company Name *
                  </label>

                  <input
                    id="company_name"
                    name="company_name"
                    value={form.company_name}
                    onChange={handleChange}
                    maxLength={150}
                    required
                    placeholder="Enter company name"
                    className="w-full rounded-lg border border-[#d6c0ad] px-4 py-3 outline-none focus:border-[#6f452c] focus:ring-2 focus:ring-[#d6c0ad]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="contact_name"
                    className="mb-2 block text-sm font-semibold text-[#6f452c]"
                  >
                    Contact Name *
                  </label>

                  <input
                    id="contact_name"
                    name="contact_name"
                    value={form.contact_name}
                    onChange={handleChange}
                    maxLength={100}
                    required
                    placeholder="Enter contact name"
                    className="w-full rounded-lg border border-[#d6c0ad] px-4 py-3 outline-none focus:border-[#6f452c] focus:ring-2 focus:ring-[#d6c0ad]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="vendor_email"
                    className="mb-2 block text-sm font-semibold text-[#6f452c]"
                  >
                    Email Address *
                  </label>

                  <input
                    id="vendor_email"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required={editingId === null}
                    disabled={editingId !== null}
                    autoComplete="email"
                    placeholder="Enter email address"
                    className="w-full rounded-lg border border-[#d6c0ad] px-4 py-3 outline-none focus:border-[#6f452c] focus:ring-2 focus:ring-[#d6c0ad] disabled:bg-[#f5eee7] disabled:text-[#8b6a52]"
                  />

                  {editingId !== null && (
                    <p className="mt-1 text-xs text-[#8b6a52]">
                      Email is managed through the user account.
                    </p>
                  )}
                </div>

                {editingId === null && (
                  <div>
                    <label
                      htmlFor="vendor_password"
                      className="mb-2 block text-sm font-semibold text-[#6f452c]"
                    >
                      Password *
                    </label>

                    <input
                      id="vendor_password"
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      minLength={8}
                      required
                      autoComplete="new-password"
                      placeholder="Minimum 8 characters"
                      className="w-full rounded-lg border border-[#d6c0ad] px-4 py-3 outline-none focus:border-[#6f452c] focus:ring-2 focus:ring-[#d6c0ad]"
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="phone"
                    className="mb-2 block text-sm font-semibold text-[#6f452c]"
                  >
                    Phone Number
                  </label>

                  <input
                    id="phone"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    maxLength={30}
                    placeholder="Enter phone number"
                    className="w-full rounded-lg border border-[#d6c0ad] px-4 py-3 outline-none focus:border-[#6f452c] focus:ring-2 focus:ring-[#d6c0ad]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="gst_number"
                    className="mb-2 block text-sm font-semibold text-[#6f452c]"
                  >
                    GST Number *
                  </label>

                  <input
                    id="gst_number"
                    name="gst_number"
                    value={form.gst_number}
                    onChange={handleChange}
                    required={editingId === null}
                    disabled={editingId !== null}
                    maxLength={30}
                    placeholder="Enter GST number"
                    className="w-full rounded-lg border border-[#d6c0ad] px-4 py-3 outline-none focus:border-[#6f452c] focus:ring-2 focus:ring-[#d6c0ad] disabled:bg-[#f5eee7] disabled:text-[#8b6a52]"
                  />

                  {editingId !== null && (
                    <p className="mt-1 text-xs text-[#8b6a52]">
                      GST number cannot be changed by this form.
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="address"
                    className="mb-2 block text-sm font-semibold text-[#6f452c]"
                  >
                    Address
                  </label>

                  <textarea
                    id="address"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Enter company address"
                    className="w-full resize-y rounded-lg border border-[#d6c0ad] px-4 py-3 outline-none focus:border-[#6f452c] focus:ring-2 focus:ring-[#d6c0ad]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#6f452c] px-5 py-2.5 font-semibold text-white hover:bg-[#54331f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingId === null
                      ? "Create Vendor"
                      : "Update Vendor"}
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

        {/* Filter */}
        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-[#d6c0ad] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Search size={18} className="text-[#8b6a52]" />

            <label
              htmlFor="verification-filter"
              className="text-sm font-semibold text-[#6f452c]"
            >
              Verification Status
            </label>
          </div>

          <select
            id="verification-filter"
            value={statusFilter}
            onChange={handleFilterChange}
            className="w-full rounded-lg border border-[#d6c0ad] bg-white px-4 py-2.5 text-[#54331f] outline-none focus:border-[#6f452c] focus:ring-2 focus:ring-[#d6c0ad] sm:w-64"
          >
            <option value="">All Vendors</option>
            <option value="PENDING">Pending</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {/* Vendor Table */}
        <div className="overflow-hidden rounded-xl border border-[#d6c0ad] bg-white shadow-sm">
          <div className="border-b border-[#eadbcf] px-5 py-4">
            <h2 className="font-bold text-[#6f452c]">
              Vendor List
            </h2>
          </div>

          {loading ? (
            <div className="p-10 text-center text-[#8b6a52]">
              Loading vendors...
            </div>
          ) : vendors.length === 0 ? (
            <div className="p-10 text-center">
              <Store
                size={40}
                className="mx-auto mb-3 text-[#8b6a52]"
              />

              <h3 className="font-semibold text-[#6f452c]">
                No vendors found
              </h3>

              <p className="mt-1 text-sm text-[#8b6a52]">
                No vendors match the selected filter.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left">
                  <thead className="bg-[#f5eee7]">
                    <tr>
                      <th className="px-5 py-3 text-sm font-semibold text-[#6f452c]">
                        ID
                      </th>

                      <th className="px-5 py-3 text-sm font-semibold text-[#6f452c]">
                        Company
                      </th>

                      <th className="px-5 py-3 text-sm font-semibold text-[#6f452c]">
                        Contact
                      </th>

                      <th className="px-5 py-3 text-sm font-semibold text-[#6f452c]">
                        Phone
                      </th>

                      <th className="px-5 py-3 text-sm font-semibold text-[#6f452c]">
                        GST Number
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
                    {vendors.map((vendor) => (
                      <tr
                        key={vendor.id}
                        className="transition hover:bg-[#fcf9f6]"
                      >
                        <td className="px-5 py-4 text-sm">
                          {vendor.id}
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-[#6f452c]">
                            {vendor.company_name}
                          </p>

                          <p className="mt-1 text-xs text-[#8b6a52]">
                            {vendor.address || "No address"}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm">
                          {vendor.contact_name}
                        </td>

                        <td className="px-5 py-4 text-sm">
                          {vendor.phone || "Not provided"}
                        </td>

                        <td className="px-5 py-4 text-sm">
                          {vendor.gst_number}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                              vendor.verification_status
                            )}`}
                          >
                            {vendor.verification_status || "PENDING"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(vendor)}
                              title="Edit vendor"
                              aria-label={`Edit ${vendor.company_name}`}
                              className="rounded-lg border border-[#d6c0ad] p-2 text-[#6f452c] hover:bg-[#eadbcf]"
                            >
                              <Pencil size={17} />
                            </button>

                            {vendor.verification_status !== "VERIFIED" && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleVerification(vendor, "VERIFIED")
                                }
                                disabled={processingId === vendor.id}
                                title="Verify vendor"
                                aria-label={`Verify ${vendor.company_name}`}
                                className="rounded-lg border border-[#d6c0ad] p-2 text-[#6f452c] hover:bg-[#eadbcf] disabled:opacity-50"
                              >
                                <ShieldCheck size={17} />
                              </button>
                            )}

                            {vendor.verification_status !== "REJECTED" && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleVerification(vendor, "REJECTED")
                                }
                                disabled={processingId === vendor.id}
                                title="Reject vendor"
                                className="rounded-lg border border-[#d6c0ad] px-3 py-2 text-xs font-semibold text-[#6f452c] hover:bg-[#eadbcf] disabled:opacity-50"
                              >
                                Reject
                              </button>
                            )}
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
          Only administrators can create vendors or verify/reject vendor accounts.
          Vendors can update their own permitted profile fields.
        </p>
      </div>
    </div>
  );
}

export default Vendors;