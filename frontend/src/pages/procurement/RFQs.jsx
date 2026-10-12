import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Send,
  Lock,
  X,
  RefreshCw,
  FileText,
  Trash2,
  Upload,
  ExternalLink,
} from "lucide-react";
import API from "../../api/axios";
import { toast } from "react-toastify";

const inputClass =
  "w-full rounded-lg border border-[#d6c0ad] bg-white px-3 py-2 text-sm text-[#54331f] outline-none focus:border-[#6f452c]";

const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#6f452c] px-4 py-2 text-sm font-medium text-white hover:bg-[#54331f] disabled:cursor-not-allowed disabled:opacity-50";

const allowedExtensions = [
  ".pdf",
  ".doc",
  ".docx",
  ".png",
  ".jpg",
  ".jpeg",
];

const initialForm = {
  title: "",
  description: "",
  department_id: "",
  submission_deadline: "",
  required_delivery_date: "",
  terms_and_conditions: "",
  attachment_url: "",
  items: [
    {
      item_name: "",
      description: "",
      quantity: "1",
      unit: "",
      specifications: "",
    },
  ],
};

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString();
}

function getErrorMessage(error, fallback) {
  const detail = error.response?.data?.detail;

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).join(", ");
  }

  return detail || error.message || fallback;
}

function toDateTimeLocal(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  );

  return localDate.toISOString().slice(0, 16);
}

function RFQs() {
  const [rfqs, setRfqs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [page, setPage] = useState(1);
  const limit = 10;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingRfq, setEditingRfq] = useState(null);
  const [viewingRfq, setViewingRfq] = useState(null);
  const [responseCount, setResponseCount] = useState(null);

  const [form, setForm] = useState(initialForm);
  const [attachmentFile, setAttachmentFile] = useState(null);

  const fetchDepartments = async () => {
    try {
      const response = await API.get("/departments/", {
        params: { page: 1, limit: 100 },
      });

      const data = response.data;

      setDepartments(
        Array.isArray(data) ? data : data.items || []
      );
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Failed to load departments.")
      );
    }
  };

  const fetchRfqs = async () => {
    setLoading(true);

    try {
      const params = { page, limit };

      if (statusFilter) params.status = statusFilter;
      if (search.trim()) params.search = search.trim();

      const response = await API.get("/rfqs/", { params });

      setRfqs(
        Array.isArray(response.data) ? response.data : []
      );
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Failed to load RFQs.")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchRfqs();
  }, [page, statusFilter, search]);

  const openCreateForm = () => {
    setEditingRfq(null);

    setForm({
      ...initialForm,
      items: initialForm.items.map((item) => ({ ...item })),
    });

    setAttachmentFile(null);
    setShowForm(true);
    setViewingRfq(null);
    setResponseCount(null);
  };

  const openEditForm = async (rfq) => {
    try {
      const response = await API.get(`/rfqs/${rfq.id}`);
      const details = response.data;

      if (details.status !== "DRAFT") {
        toast.error("Only draft RFQs can be edited.");
        return;
      }

      setEditingRfq(details);

      setForm({
        title: details.title || "",
        description: details.description || "",
        department_id: String(details.department_id || ""),
        submission_deadline: toDateTimeLocal(
          details.submission_deadline
        ),
        required_delivery_date: toDateTimeLocal(
          details.required_delivery_date
        ),
        terms_and_conditions:
          details.terms_and_conditions || "",
        attachment_url: details.attachment_url || "",
        items:
          details.items?.length > 0
            ? details.items.map((item) => ({
                item_name: item.item_name || "",
                description: item.description || "",
                quantity: String(item.quantity ?? "1"),
                unit: item.unit || "",
                specifications: item.specifications || "",
              }))
            : initialForm.items.map((item) => ({ ...item })),
      });

      setAttachmentFile(null);
      setShowForm(true);
      setViewingRfq(null);
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Failed to load RFQ details.")
      );
    }
  };

  const updateForm = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const updateItem = (index, field, value) => {
    setForm((previous) => ({
      ...previous,
      items: previous.items.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, [field]: value }
          : item
      ),
    }));
  };

  const addItem = () => {
    setForm((previous) => ({
      ...previous,
      items: [
        ...previous.items,
        {
          item_name: "",
          description: "",
          quantity: "1",
          unit: "",
          specifications: "",
        },
      ],
    }));
  };

  const removeItem = (index) => {
    setForm((previous) => ({
      ...previous,
      items: previous.items.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }));
  };

  const handleAttachmentChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const extension = `.${file.name.split(".").pop().toLowerCase()}`;

    if (!allowedExtensions.includes(extension)) {
      toast.error(
        "Only PDF, DOC, DOCX, PNG, JPG, and JPEG files are allowed."
      );
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must not exceed 10 MB.");
      event.target.value = "";
      return;
    }

    setAttachmentFile(file);
  };

  const uploadAttachment = async () => {
    if (!attachmentFile) {
      return form.attachment_url.trim() || null;
    }

    const formData = new FormData();
    formData.append("file", attachmentFile);

    setUploading(true);

    try {
      const response = await API.post(
        "/rfqs/upload-attachment",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const attachmentUrl =
        response.data.attachment_url ||
        response.data.document_url ||
        response.data.url;

      if (!attachmentUrl) {
        throw new Error(
          "Upload response does not contain an attachment URL."
        );
      }

      return attachmentUrl;
    } finally {
      setUploading(false);
    }
  };

  const saveRfq = async (event) => {
    event.preventDefault();

    if (!form.department_id) {
      toast.error("Please select a department.");
      return;
    }

    if (!form.submission_deadline) {
      toast.error("Please select a submission deadline.");
      return;
    }

    const deadline = new Date(form.submission_deadline);

    if (
      Number.isNaN(deadline.getTime()) ||
      deadline <= new Date()
    ) {
      toast.error("Submission deadline must be in the future.");
      return;
    }

    if (form.required_delivery_date) {
      const deliveryDate = new Date(
        form.required_delivery_date
      );

      if (
        Number.isNaN(deliveryDate.getTime()) ||
        deliveryDate < deadline
      ) {
        toast.error(
          "Required delivery date cannot be before the submission deadline."
        );
        return;
      }
    }

    if (
      form.items.length === 0 ||
      form.items.some(
        (item) =>
          !item.item_name.trim() ||
          !item.unit.trim() ||
          !Number.isFinite(Number(item.quantity)) ||
          Number(item.quantity) <= 0
      )
    ) {
      toast.error(
        "Add at least one item with a name, unit, and valid quantity."
      );
      return;
    }

    setSaving(true);

    try {
      const attachmentUrl = await uploadAttachment();

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        department_id: Number(form.department_id),
        submission_deadline: deadline.toISOString(),
        required_delivery_date: form.required_delivery_date
          ? new Date(
              form.required_delivery_date
            ).toISOString()
          : null,
        terms_and_conditions:
          form.terms_and_conditions.trim() || null,
        attachment_url: attachmentUrl,
        items: form.items.map((item) => ({
          item_name: item.item_name.trim(),
          description: item.description.trim() || null,
          quantity: Number(item.quantity),
          unit: item.unit.trim(),
          specifications:
            item.specifications.trim() || null,
        })),
      };

      if (editingRfq) {
        await API.put(`/rfqs/${editingRfq.id}`, payload);
        toast.success("RFQ updated successfully.");
      } else {
        await API.post("/rfqs/", payload);
        toast.success("RFQ created successfully.");
      }

      setShowForm(false);
      setEditingRfq(null);
      setAttachmentFile(null);
      setForm({
        ...initialForm,
        items: initialForm.items.map((item) => ({ ...item })),
      });

      await fetchRfqs();
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Failed to save RFQ.")
      );
    } finally {
      setSaving(false);
    }
  };

  const publishRfq = async (rfq) => {
    if (
      !window.confirm(
        `Publish ${rfq.rfq_number || `RFQ-${rfq.id}`}? Verified vendors will be notified.`
      )
    ) {
      return;
    }

    try {
      await API.patch(`/rfqs/${rfq.id}/publish`);
      toast.success("RFQ published successfully.");
      await fetchRfqs();
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Failed to publish RFQ.")
      );
    }
  };

  const closeRfq = async (rfq) => {
    if (
      !window.confirm(
        `Close ${rfq.rfq_number || `RFQ-${rfq.id}`}?`
      )
    ) {
      return;
    }

    try {
      await API.patch(`/rfqs/${rfq.id}/close`);
      toast.success("RFQ closed successfully.");
      await fetchRfqs();
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Failed to close RFQ.")
      );
    }
  };

  const viewRfq = async (rfq) => {
    try {
      const response = await API.get(`/rfqs/${rfq.id}`);

      setViewingRfq(response.data);
      setResponseCount(null);
      setShowForm(false);
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Failed to load RFQ details.")
      );
    }
  };

  const fetchResponseCount = async (rfq) => {
    try {
      const response = await API.get(
        `/rfqs/${rfq.id}/response-count`
      );

      setResponseCount({
        rfqId: rfq.id,
        count: response.data.response_count,
      });
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Failed to load response count.")
      );
    }
  };

  const closeModals = () => {
    setShowForm(false);
    setEditingRfq(null);
    setViewingRfq(null);
    setResponseCount(null);
    setAttachmentFile(null);
  };

  const statusClass = (status) => {
    const styles = {
      DRAFT: "bg-[#f5eee7] text-[#6f452c]",
      PUBLISHED: "bg-[#eadbcf] text-[#54331f]",
      CLOSED: "bg-[#e5d5c8] text-[#54331f]",
      AWARDED: "bg-[#d6c0ad] text-[#54331f]",
      CANCELLED: "bg-[#f1e5dc] text-[#8b6a52]",
    };

    return styles[status] || "bg-[#f5eee7] text-[#6f452c]";
  };

  return (
    <div className="min-h-screen bg-[#f5eee7] p-4 text-[#54331f] sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">
              Request for Quotations
            </h1>
            <p className="mt-1 text-sm text-[#8b6a52]">
              Create RFQs, manage deadlines, and review vendor responses.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={fetchRfqs}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-[#d6c0ad] bg-white px-4 py-2 text-sm hover:bg-[#f5eee7] disabled:opacity-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreateForm}
              className={buttonClass}
            >
              <Plus size={17} />
              Create RFQ
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[#e0cdbd] bg-white p-5 shadow-sm">
            <p className="text-sm text-[#8b6a52]">
              RFQs on this page
            </p>
            <p className="mt-2 text-3xl font-bold">
              {rfqs.length}
            </p>
          </div>

          <div className="rounded-xl border border-[#e0cdbd] bg-white p-5 shadow-sm">
            <p className="text-sm text-[#8b6a52]">
              Current filter
            </p>
            <p className="mt-2 text-xl font-bold">
              {statusFilter || "All statuses"}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-[#e0cdbd] bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b6a52]"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder="Search RFQ title..."
                className={`${inputClass} pl-10`}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => {
                setPage(1);
                setStatusFilter(event.target.value);
              }}
              className={inputClass}
            >
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="CLOSED">Closed</option>
              <option value="AWARDED">Awarded</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#e0cdbd] bg-white shadow-sm">
          <div className="border-b border-[#eadbcf] px-5 py-4">
            <h2 className="font-semibold">RFQ List</h2>
          </div>

          {loading ? (
            <div className="p-10 text-center text-[#8b6a52]">
              Loading RFQs...
            </div>
          ) : rfqs.length === 0 ? (
            <div className="p-10 text-center text-[#8b6a52]">
              No RFQs found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead className="bg-[#f5eee7] text-[#6f452c]">
                  <tr>
                    <th className="px-4 py-3">RFQ Number</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Deadline</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {rfqs.map((rfq) => (
                    <tr
                      key={rfq.id}
                      className="border-t border-[#eadbcf] hover:bg-[#fcf9f6]"
                    >
                      <td className="px-4 py-4 font-medium">
                        {rfq.rfq_number || `RFQ-${rfq.id}`}
                      </td>

                      <td className="max-w-[220px] px-4 py-4">
                        <p className="truncate font-medium">
                          {rfq.title}
                        </p>
                        <p className="mt-1 text-xs text-[#8b6a52]">
                          {rfq.items?.length || 0} items
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        {departments.find(
                          (department) =>
                            department.id === rfq.department_id
                        )?.name || `Department ${rfq.department_id}`}
                      </td>

                      <td className="px-4 py-4">
                        {formatDate(rfq.submission_deadline)}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(rfq.status)}`}
                        >
                          {rfq.status}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => viewRfq(rfq)}
                            title="View RFQ"
                            className="rounded-lg border border-[#d6c0ad] p-2 hover:bg-[#f5eee7]"
                          >
                            <Eye size={16} />
                          </button>

                          {rfq.status === "DRAFT" && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditForm(rfq)}
                                title="Edit draft"
                                className="rounded-lg border border-[#d6c0ad] p-2 hover:bg-[#f5eee7]"
                              >
                                <Pencil size={16} />
                              </button>

                              <button
                                type="button"
                                onClick={() => publishRfq(rfq)}
                                title="Publish RFQ"
                                className="rounded-lg border border-[#d6c0ad] p-2 hover:bg-[#f5eee7]"
                              >
                                <Send size={16} />
                              </button>
                            </>
                          )}

                          {rfq.status === "PUBLISHED" && (
                            <>
                              <button
                                type="button"
                                onClick={() => closeRfq(rfq)}
                                title="Close RFQ"
                                className="rounded-lg border border-[#d6c0ad] p-2 hover:bg-[#f5eee7]"
                              >
                                <Lock size={16} />
                              </button>

                              <button
                                type="button"
                                onClick={() => fetchResponseCount(rfq)}
                                title="Response count"
                                className="rounded-lg border border-[#d6c0ad] p-2 hover:bg-[#f5eee7]"
                              >
                                <FileText size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-[#eadbcf] px-5 py-4">
            <span className="text-sm text-[#8b6a52]">
              Page {page}
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={page === 1 || loading}
                onClick={() => setPage((previous) => previous - 1)}
                className="rounded-lg border border-[#d6c0ad] px-3 py-2 text-sm disabled:opacity-40"
              >
                Previous
              </button>

              <button
                type="button"
                disabled={rfqs.length < limit || loading}
                onClick={() => setPage((previous) => previous + 1)}
                className="rounded-lg border border-[#d6c0ad] px-3 py-2 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {responseCount !== null && (
          <div className="rounded-xl border border-[#d6c0ad] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">
                Vendor responses for RFQ #{responseCount.rfqId}:{" "}
                {responseCount.count}
              </p>

              <button
                type="button"
                onClick={() => setResponseCount(null)}
                className="rounded-lg p-2 hover:bg-[#f5eee7]"
                aria-label="Close response count"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-6">
            <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-xl">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#eadbcf] bg-white px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold">
                    {editingRfq ? "Edit Draft RFQ" : "Create RFQ"}
                  </h2>
                  <p className="mt-1 text-sm text-[#8b6a52]">
                    Add the RFQ details and required items.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModals}
                  className="rounded-lg p-2 hover:bg-[#f5eee7]"
                  aria-label="Close form"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={saveRfq} className="space-y-5 p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      RFQ Title *
                    </label>
                    <input
                      value={form.title}
                      onChange={(event) =>
                        updateForm("title", event.target.value)
                      }
                      required
                      maxLength={200}
                      className={inputClass}
                      placeholder="Enter RFQ title"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Department *
                    </label>
                    <select
                      value={form.department_id}
                      onChange={(event) =>
                        updateForm("department_id", event.target.value)
                      }
                      required
                      className={inputClass}
                    >
                      <option value="">Select department</option>
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

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Submission Deadline *
                    </label>
                    <input
                      type="datetime-local"
                      value={form.submission_deadline}
                      min={toDateTimeLocal(
                        new Date(Date.now() + 60000).toISOString()
                      )}
                      onChange={(event) =>
                        updateForm(
                          "submission_deadline",
                          event.target.value
                        )
                      }
                      required
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Required Delivery Date
                    </label>
                    <input
                      type="datetime-local"
                      value={form.required_delivery_date}
                      min={form.submission_deadline || undefined}
                      onChange={(event) =>
                        updateForm(
                          "required_delivery_date",
                          event.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(event) =>
                      updateForm("description", event.target.value)
                    }
                    className={inputClass}
                    placeholder="Describe the procurement requirement"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Terms and Conditions
                  </label>
                  <textarea
                    rows={3}
                    value={form.terms_and_conditions}
                    onChange={(event) =>
                      updateForm(
                        "terms_and_conditions",
                        event.target.value
                      )
                    }
                    className={inputClass}
                    placeholder="Enter terms and conditions"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    RFQ Attachment
                  </label>

                  <div className="rounded-xl border border-dashed border-[#c9ad98] bg-[#fcf9f6] p-4">
                    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg px-4 py-5 text-center hover:bg-[#f5eee7]">
                      <Upload
                        size={26}
                        className="text-[#6f452c]"
                      />
                      <span className="text-sm font-medium">
                        Choose a file to upload
                      </span>
                      <span className="text-xs text-[#8b6a52]">
                        PDF, DOC, DOCX, PNG, JPG, JPEG · Maximum 10 MB
                      </span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                        onChange={handleAttachmentChange}
                        className="hidden"
                      />
                    </label>

                    {attachmentFile && (
                      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-[#eadbcf] bg-white p-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <FileText
                            size={20}
                            className="shrink-0 text-[#6f452c]"
                          />

                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {attachmentFile.name}
                            </p>
                            <p className="text-xs text-[#8b6a52]">
                              {(
                                attachmentFile.size /
                                (1024 * 1024)
                              ).toFixed(2)}{" "}
                              MB
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setAttachmentFile(null)}
                          className="rounded-lg p-2 hover:bg-[#f5eee7]"
                          aria-label="Remove selected file"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}

                    {!attachmentFile && form.attachment_url && (
                      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-[#eadbcf] bg-white p-3">
                        <span className="text-sm text-[#6f452c]">
                          Existing attachment
                        </span>

                        <a
                          href={form.attachment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm underline"
                        >
                          View <ExternalLink size={14} />
                        </a>
                      </div>
                    )}

                    <div className="mt-4">
                      <label className="mb-1 block text-sm font-medium">
                        Attachment URL
                      </label>
                      <input
                        type="url"
                        value={form.attachment_url}
                        onChange={(event) =>
                          updateForm(
                            "attachment_url",
                            event.target.value
                          )
                        }
                        disabled={Boolean(attachmentFile)}
                        className={inputClass}
                        placeholder="https://example.com/document.pdf"
                      />
                      <p className="mt-1 text-xs text-[#8b6a52]">
                        Use an existing hosted file URL, or select a file
                        to upload through the backend endpoint.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold">RFQ Items *</h3>

                    <button
                      type="button"
                      onClick={addItem}
                      className="inline-flex items-center gap-2 rounded-lg border border-[#d6c0ad] px-3 py-2 text-sm hover:bg-[#f5eee7]"
                    >
                      <Plus size={16} />
                      Add Item
                    </button>
                  </div>

                  {form.items.map((item, index) => (
                    <div
                      key={index}
                      className="space-y-4 rounded-xl border border-[#eadbcf] p-4"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">
                          Item {index + 1}
                        </h4>

                        {form.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            title="Remove item"
                            className="rounded-lg border border-[#d6c0ad] p-2 hover:bg-[#f5eee7]"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-sm">
                            Item Name *
                          </label>
                          <input
                            value={item.item_name}
                            onChange={(event) =>
                              updateItem(
                                index,
                                "item_name",
                                event.target.value
                              )
                            }
                            required
                            className={inputClass}
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm">
                            Quantity *
                          </label>
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={item.quantity}
                            onChange={(event) =>
                              updateItem(
                                index,
                                "quantity",
                                event.target.value
                              )
                            }
                            required
                            className={inputClass}
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm">
                            Unit *
                          </label>
                          <input
                            value={item.unit}
                            onChange={(event) =>
                              updateItem(
                                index,
                                "unit",
                                event.target.value
                              )
                            }
                            required
                            placeholder="e.g. pieces, kg, boxes"
                            className={inputClass}
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm">
                            Item Description
                          </label>
                          <input
                            value={item.description}
                            onChange={(event) =>
                              updateItem(
                                index,
                                "description",
                                event.target.value
                              )
                            }
                            className={inputClass}
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="mb-1 block text-sm">
                            Specifications
                          </label>
                          <textarea
                            rows={2}
                            value={item.specifications}
                            onChange={(event) =>
                              updateItem(
                                index,
                                "specifications",
                                event.target.value
                              )
                            }
                            className={inputClass}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap justify-end gap-3 border-t border-[#eadbcf] pt-4">
                  <button
                    type="button"
                    onClick={closeModals}
                    className="rounded-lg border border-[#d6c0ad] px-4 py-2 text-sm hover:bg-[#f5eee7]"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      saving ||
                      uploading ||
                      departments.length === 0
                    }
                    className={buttonClass}
                  >
                    {uploading
                      ? "Uploading..."
                      : saving
                        ? "Saving..."
                        : editingRfq
                          ? "Update RFQ"
                          : "Create RFQ"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {viewingRfq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-6">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-[#eadbcf] px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold">
                    {viewingRfq.rfq_number ||
                      `RFQ-${viewingRfq.id}`}
                  </h2>
                  <p className="text-sm text-[#8b6a52]">
                    {viewingRfq.title}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModals}
                  className="rounded-lg p-2 hover:bg-[#f5eee7]"
                  aria-label="Close RFQ details"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-5 p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg bg-[#f5eee7] p-4">
                    <p className="text-sm text-[#8b6a52]">Status</p>
                    <p className="mt-1 font-semibold">
                      {viewingRfq.status}
                    </p>
                  </div>

                  <div className="rounded-lg bg-[#f5eee7] p-4">
                    <p className="text-sm text-[#8b6a52]">
                      Submission Deadline
                    </p>
                    <p className="mt-1 font-semibold">
                      {formatDate(viewingRfq.submission_deadline)}
                    </p>
                  </div>

                  <div className="rounded-lg bg-[#f5eee7] p-4">
                    <p className="text-sm text-[#8b6a52]">
                      Required Delivery
                    </p>
                    <p className="mt-1 font-semibold">
                      {formatDate(viewingRfq.required_delivery_date)}
                    </p>
                  </div>

                  <div className="rounded-lg bg-[#f5eee7] p-4">
                    <p className="text-sm text-[#8b6a52]">
                      Department
                    </p>
                    <p className="mt-1 font-semibold">
                      {departments.find(
                        (department) =>
                          department.id === viewingRfq.department_id
                      )?.name ||
                        `Department ${viewingRfq.department_id}`}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 font-semibold">Description</h3>
                  <p className="whitespace-pre-wrap text-sm text-[#8b6a52]">
                    {viewingRfq.description ||
                      "No description provided."}
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 font-semibold">
                    Terms and Conditions
                  </h3>
                  <p className="whitespace-pre-wrap text-sm text-[#8b6a52]">
                    {viewingRfq.terms_and_conditions ||
                      "No terms and conditions provided."}
                  </p>
                </div>

                {viewingRfq.attachment_url && (
                  <a
                    href={viewingRfq.attachment_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-[#6f452c] underline"
                  >
                    <FileText size={16} />
                    Open RFQ attachment
                    <ExternalLink size={14} />
                  </a>
                )}

                <div>
                  <h3 className="mb-3 font-semibold">
                    Required Items
                  </h3>

                  {(viewingRfq.items || []).length === 0 ? (
                    <p className="text-sm text-[#8b6a52]">
                      No items found.
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-[#eadbcf]">
                      <table className="w-full min-w-[500px] text-left text-sm">
                        <thead className="bg-[#f5eee7]">
                          <tr>
                            <th className="px-4 py-3">Item</th>
                            <th className="px-4 py-3">Quantity</th>
                            <th className="px-4 py-3">Unit</th>
                            <th className="px-4 py-3">
                              Specifications
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {(viewingRfq.items || []).map(
                            (item, index) => (
                              <tr
                                key={item.id ?? index}
                                className="border-t border-[#eadbcf]"
                              >
                                <td className="px-4 py-3">
                                  {item.item_name}
                                </td>
                                <td className="px-4 py-3">
                                  {item.quantity}
                                </td>
                                <td className="px-4 py-3">
                                  {item.unit}
                                </td>
                                <td className="px-4 py-3">
                                  {item.specifications || "—"}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={closeModals}
                    className={buttonClass}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RFQs;


