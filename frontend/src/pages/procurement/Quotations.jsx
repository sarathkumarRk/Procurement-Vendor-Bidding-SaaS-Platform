
import { useEffect, useState } from "react";
import {
  FileText,
  Search,
  Upload,
  Send,
  Eye,
  X,
  RefreshCw,
} from "lucide-react";
import API from "../../api/axios";
import { toast } from "react-toastify";

const inputClass =
  "w-full rounded-lg border border-[#d6c0ad] bg-white px-3 py-2 text-sm text-[#54331f] outline-none focus:border-[#6f452c]";

const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#6f452c] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#54331f] disabled:cursor-not-allowed disabled:opacity-60";

function formatDate(value) {
  if (!value) return "Not specified";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString();
}

function formatAmount(value) {
  const amount = Number(value || 0);

  return amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function Quotations() {
  const [rfqs, setRfqs] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [selectedRfq, setSelectedRfq] = useState(null);
  const [selectedQuotation, setSelectedQuotation] = useState(null);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [form, setForm] = useState({
    validity_date: "",
    delivery_days: "",
    comments: "",
    items: [],
  });

  const [documentFile, setDocumentFile] = useState(null);

  const fetchRfqs = async () => {
    setLoading(true);

    try {
      const response = await API.get("/rfqs/", {
        params: {
          page,
          limit,
          status: "PUBLISHED",
        },
      });

      const data = response.data;
      const records = Array.isArray(data)
        ? data
        : data.items || data.rfqs || data.results || [];

      setRfqs(records);
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Failed to load RFQs."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRfqs();
  }, [page]);

  const openRfq = async (rfq) => {
    try {
      const response = await API.get(`/rfqs/${rfq.id}`);
      const details = response.data;

      setSelectedRfq(details);

      setForm({
        validity_date: "",
        delivery_days: "",
        comments: "",
        items: (details.items || []).map((item) => ({
          rfq_item_id: item.id,
          quantity: item.quantity,
          unit_price: "",
          tax_rate: "0",
          delivery_days: "",
          compliance_status: "COMPLIANT",
        })),
      });
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Failed to load RFQ details."
      );
    }
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

  const submitQuotation = async (event) => {
    event.preventDefault();

    if (!selectedRfq) return;

    if (!form.items.length) {
      toast.error("This RFQ has no items to quote.");
      return;
    }

    if (
      !form.validity_date ||
      !form.delivery_days ||
      Number(form.delivery_days) < 1
    ) {
      toast.error("Enter a valid quotation validity date and delivery days.");
      return;
    }

    const items = form.items.map((item) => ({
      rfq_item_id: Number(item.rfq_item_id),
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      tax_rate: Number(item.tax_rate),
      delivery_days: Number(item.delivery_days || form.delivery_days),
      compliance_status: item.compliance_status,
    }));

    const invalidItem = items.some(
      (item) =>
        !Number.isFinite(item.unit_price) ||
        item.unit_price < 0 ||
        !Number.isFinite(item.tax_rate) ||
        item.tax_rate < 0 ||
        item.tax_rate > 100 ||
        !Number.isFinite(item.delivery_days) ||
        item.delivery_days < 1
    );

    if (invalidItem) {
      toast.error("Check every item's price, tax rate, and delivery days.");
      return;
    }

    setSubmitting(true);

    try {
      await API.post(`/quotations/rfqs/${selectedRfq.id}`, {
        validity_date: form.validity_date,
        delivery_days: Number(form.delivery_days),
        comments: form.comments.trim() || null,
        items,
      });

      toast.success("Quotation submitted successfully!");
      setSelectedRfq(null);
      setForm({
        validity_date: "",
        delivery_days: "",
        comments: "",
        items: [],
      });

      await fetchRfqs();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Failed to submit quotation."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const viewQuotations = async (rfq) => {
    try {
      const response = await API.get(
        `/quotations/rfqs/${rfq.id}`,
        { params: { page: 1, limit: 100 } }
      );

      const data = response.data;
      const records = Array.isArray(data)
        ? data
        : data.items || data.quotations || [];

      setQuotations(records);
      setSelectedRfq(rfq);
      setSelectedQuotation(null);
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          "Unable to load quotations for this RFQ."
      );
    }
  };

  const uploadDocument = async (quotationId) => {
    if (!documentFile) {
      toast.error("Please select a document first.");
      return;
    }

    const allowedExtensions = [
      ".pdf",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".png",
      ".jpg",
      ".jpeg",
    ];

    const extension = documentFile.name
      .slice(documentFile.name.lastIndexOf("."))
      .toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      toast.error("Choose a PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG or PNG file.");
      return;
    }

    if (documentFile.size > 10 * 1024 * 1024) {
      toast.error("Document size must not exceed 10 MB.");
      return;
    }

    const formData = new FormData();
    formData.append("file", documentFile);

    setUploading(true);

    try {
      const response = await API.post(
        `/quotations/${quotationId}/documents`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      toast.success(
        response.data?.message || "Document uploaded successfully."
      );

      setDocumentFile(null);
      setSelectedQuotation((previous) =>
        previous
          ? {
              ...previous,
              document_url:
                response.data?.document_url || previous.document_url,
            }
          : previous
      );
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Document upload failed."
      );
    } finally {
      setUploading(false);
    }
  };

  const filteredRfqs = rfqs.filter((rfq) => {
    const searchText = search.toLowerCase();

    return (
      String(rfq.title || "").toLowerCase().includes(searchText) ||
      String(rfq.rfq_number || "").toLowerCase().includes(searchText)
    );
  });

  const closeModal = () => {
    setSelectedRfq(null);
    setSelectedQuotation(null);
    setQuotations([]);
    setDocumentFile(null);
  };

  return (
    <div className="min-h-screen bg-[#f5eee7] p-4 text-[#54331f] sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">
              Quotations
            </h1>
            <p className="mt-1 text-sm text-[#8b6a52]">
              Review published RFQs and submit your quotations.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchRfqs}
            disabled={loading}
            className={buttonClass}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        <div className="rounded-xl border border-[#e0cdbd] bg-white p-4 shadow-sm">
          <div className="relative max-w-md">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b6a52]"
            />
            <input
              type="text"
              placeholder="Search RFQ number or title..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className={`${inputClass} pl-10`}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#e0cdbd] bg-white shadow-sm">
          <div className="border-b border-[#eadbcf] px-5 py-4">
            <h2 className="font-semibold">Published RFQs</h2>
          </div>

          {loading ? (
            <div className="p-10 text-center text-[#8b6a52]">
              Loading RFQs...
            </div>
          ) : filteredRfqs.length === 0 ? (
            <div className="p-10 text-center text-[#8b6a52]">
              No published RFQs found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] text-left text-sm">
                <thead className="bg-[#f5eee7] text-[#6f452c]">
                  <tr>
                    <th className="px-5 py-3">RFQ Number</th>
                    <th className="px-5 py-3">Title</th>
                    <th className="px-5 py-3">Deadline</th>
                    <th className="px-5 py-3">Items</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRfqs.map((rfq) => (
                    <tr
                      key={rfq.id}
                      className="border-t border-[#eadbcf] hover:bg-[#fcf9f6]"
                    >
                      <td className="px-5 py-4 font-medium">
                        {rfq.rfq_number || `RFQ-${rfq.id}`}
                      </td>
                      <td className="px-5 py-4">
                        {rfq.title || "Untitled RFQ"}
                      </td>
                      <td className="px-5 py-4">
                        {formatDate(rfq.submission_deadline)}
                      </td>
                      <td className="px-5 py-4">
                        {Array.isArray(rfq.items)
                          ? rfq.items.length
                          : rfq.item_count ?? "—"}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openRfq(rfq)}
                            className={buttonClass}
                          >
                            <Send size={15} />
                            Submit Bid
                          </button>

                          <button
                            type="button"
                            onClick={() => viewQuotations(rfq)}
                            className="inline-flex items-center gap-2 rounded-lg border border-[#d6c0ad] px-3 py-2 text-sm hover:bg-[#f5eee7]"
                          >
                            <Eye size={15} />
                            View
                          </button>
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

        {selectedRfq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-6">
            <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-xl">
              <div className="sticky top-0 flex items-center justify-between border-b border-[#eadbcf] bg-white px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold">
                    {selectedQuotation
                      ? "Quotation Details"
                      : `RFQ: ${selectedRfq.rfq_number || selectedRfq.id}`}
                  </h2>
                  <p className="text-sm text-[#8b6a52]">
                    {selectedRfq.title || "Quotation management"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg p-2 hover:bg-[#f5eee7]"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              {selectedQuotation ? (
                <div className="space-y-5 p-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg bg-[#f5eee7] p-4">
                      <p className="text-sm text-[#8b6a52]">
                        Quotation Number
                      </p>
                      <p className="mt-1 font-semibold">
                        {selectedQuotation.quotation_number ||
                          `QUO-${selectedQuotation.id}`}
                      </p>
                    </div>

                    <div className="rounded-lg bg-[#f5eee7] p-4">
                      <p className="text-sm text-[#8b6a52]">
                        Total Amount
                      </p>
                      <p className="mt-1 font-semibold">
                        ₹{formatAmount(selectedQuotation.total_amount)}
                      </p>
                    </div>

                    <div className="rounded-lg bg-[#f5eee7] p-4">
                      <p className="text-sm text-[#8b6a52]">Status</p>
                      <p className="mt-1 font-semibold">
                        {selectedQuotation.status || "—"}
                      </p>
                    </div>

                    <div className="rounded-lg bg-[#f5eee7] p-4">
                      <p className="text-sm text-[#8b6a52]">
                        Valid Until
                      </p>
                      <p className="mt-1 font-semibold">
                        {formatDate(selectedQuotation.validity_date)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#eadbcf] p-4">
                    <h3 className="mb-3 font-semibold">
                      Upload Quotation Document
                    </h3>

                    <p className="mb-3 text-sm text-[#8b6a52]">
                      PDF, DOC, DOCX, XLS, XLSX, JPG or PNG. Maximum 10 MB.
                    </p>

                    {selectedQuotation.document_url && (
                      <a
                        href={selectedQuotation.document_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-[#6f452c] underline"
                      >
                        <FileText size={16} />
                        View uploaded document
                      </a>
                    )}

                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                      onChange={(event) =>
                        setDocumentFile(event.target.files?.[0] || null)
                      }
                      className={`${inputClass} mb-3`}
                    />

                    <button
                      type="button"
                      disabled={uploading || !documentFile}
                      onClick={() =>
                        uploadDocument(selectedQuotation.id)
                      }
                      className={buttonClass}
                    >
                      <Upload size={16} />
                      {uploading ? "Uploading..." : "Upload Document"}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedQuotation(null)}
                    className="rounded-lg border border-[#d6c0ad] px-4 py-2 text-sm hover:bg-[#f5eee7]"
                  >
                    Back to Quotations
                  </button>
                </div>
              ) : quotations.length > 0 ? (
                <div className="overflow-x-auto p-5">
                  <table className="w-full min-w-[650px] text-left text-sm">
                    <thead className="bg-[#f5eee7]">
                      <tr>
                        <th className="px-4 py-3">Quotation</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {quotations.map((quotation) => (
                        <tr
                          key={quotation.id}
                          className="border-t border-[#eadbcf]"
                        >
                          <td className="px-4 py-3">
                            {quotation.quotation_number ||
                              `QUO-${quotation.id}`}
                          </td>
                          <td className="px-4 py-3">
                            ₹{formatAmount(quotation.total_amount)}
                          </td>
                          <td className="px-4 py-3">
                            {quotation.status || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedQuotation(quotation)
                              }
                              className="inline-flex items-center gap-2 rounded-lg border border-[#d6c0ad] px-3 py-2 hover:bg-[#f5eee7]"
                            >
                              <Eye size={15} />
                              Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <form onSubmit={submitQuotation} className="space-y-5 p-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Quotation Validity Date *
                      </label>
                      <input
                        type="date"
                        min={new Date(Date.now() + 86400000)
                          .toISOString()
                          .slice(0, 10)}
                        value={form.validity_date}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            validity_date: event.target.value,
                          })
                        }
                        required
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Overall Delivery Days *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={form.delivery_days}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            delivery_days: event.target.value,
                          })
                        }
                        required
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 font-semibold">RFQ Items</h3>

                    {form.items.length === 0 ? (
                      <p className="rounded-lg bg-[#f5eee7] p-4 text-sm text-[#8b6a52]">
                        No RFQ items were returned. Check the RFQ detail
                        response and its items field.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {form.items.map((item, index) => {
                          const rfqItem = (selectedRfq.items || []).find(
                            (entry) => entry.id === item.rfq_item_id
                          );

                          return (
                            <div
                              key={item.rfq_item_id}
                              className="rounded-xl border border-[#eadbcf] p-4"
                            >
                              <div className="mb-4">
                                <p className="font-semibold">
                                  {rfqItem?.item_name ||
                                    rfqItem?.name ||
                                    rfqItem?.description ||
                                    `RFQ Item ${item.rfq_item_id}`}
                                </p>
                                <p className="mt-1 text-sm text-[#8b6a52]">
                                  Required quantity: {item.quantity}
                                </p>
                              </div>

                              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                <div>
                                  <label className="mb-1 block text-sm">
                                    Unit Price *
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.unit_price}
                                    onChange={(event) =>
                                      updateItem(
                                        index,
                                        "unit_price",
                                        event.target.value
                                      )
                                    }
                                    required
                                    className={inputClass}
                                  />
                                </div>

                                <div>
                                  <label className="mb-1 block text-sm">
                                    Tax Rate (%) *
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={item.tax_rate}
                                    onChange={(event) =>
                                      updateItem(
                                        index,
                                        "tax_rate",
                                        event.target.value
                                      )
                                    }
                                    required
                                    className={inputClass}
                                  />
                                </div>

                                <div>
                                  <label className="mb-1 block text-sm">
                                    Delivery Days *
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.delivery_days}
                                    onChange={(event) =>
                                      updateItem(
                                        index,
                                        "delivery_days",
                                        event.target.value
                                      )
                                    }
                                    required
                                    className={inputClass}
                                  />
                                </div>

                                <div className="sm:col-span-2 lg:col-span-3">
                                  <label className="mb-1 block text-sm">
                                    Compliance Status *
                                  </label>
                                  <select
                                    value={item.compliance_status}
                                    onChange={(event) =>
                                      updateItem(
                                        index,
                                        "compliance_status",
                                        event.target.value
                                      )
                                    }
                                    required
                                    className={inputClass}
                                  >
                                    <option value="COMPLIANT">
                                      Compliant
                                    </option>
                                    <option value="PARTIALLY_COMPLIANT">
                                      Partially Compliant
                                    </option>
                                    <option value="NON_COMPLIANT">
                                      Non-compliant
                                    </option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Comments
                    </label>
                    <textarea
                      rows={3}
                      value={form.comments}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          comments: event.target.value,
                        })
                      }
                      placeholder="Add any quotation notes..."
                      className={inputClass}
                    />
                  </div>

                  <div className="flex flex-wrap justify-end gap-3 border-t border-[#eadbcf] pt-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="rounded-lg border border-[#d6c0ad] px-4 py-2 text-sm"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={submitting || form.items.length === 0}
                      className={buttonClass}
                    >
                      <Send size={16} />
                      {submitting
                        ? "Submitting..."
                        : "Submit Quotation"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Quotations;
