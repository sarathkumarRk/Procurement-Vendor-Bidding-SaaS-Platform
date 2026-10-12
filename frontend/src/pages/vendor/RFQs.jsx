import { useEffect, useState } from "react";
import {
  Search,
  Eye,
  RefreshCw,
  FileText,
  ExternalLink,
  X,
  CalendarDays,
  Package,
  Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import API from "../../api/axios";

const inputClass =
  "w-full rounded-lg border border-[#d6c0ad] bg-white px-3 py-2 text-sm text-[#54331f] outline-none focus:border-[#6f452c]";

const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#6f452c] px-4 py-2 text-sm font-medium text-white hover:bg-[#54331f] disabled:cursor-not-allowed disabled:opacity-50";

function formatDate(value) {
  if (!value) return "Not specified";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

function getErrorMessage(error, fallback) {
  const detail = error.response?.data?.detail;

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).join(", ");
  }

  return typeof detail === "string"
    ? detail
    : error.message || fallback;
}

function RFQs() {
  const navigate = useNavigate();

  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedRfq, setSelectedRfq] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const limit = 10;

  const fetchRfqs = async () => {
    setLoading(true);

    try {
      const response = await API.get("/rfqs/", {
        params: {
          page,
          limit,
          status: "PUBLISHED",
          ...(search.trim() ? { search: search.trim() } : {}),
        },
      });

      const data = Array.isArray(response.data)
        ? response.data
        : response.data.items || [];

      // Vendor-ku published RFQs mattum display pannuvom.
      const publishedRfqs = data.filter(
        (rfq) => rfq.status === "PUBLISHED"
      );

      setRfqs(publishedRfqs);
      setHasMore(data.length === limit);
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Failed to load published RFQs.")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRfqs();
  }, [page, search]);

  const viewRfq = async (rfq) => {
    setDetailsLoading(true);

    try {
      const response = await API.get(`/rfqs/${rfq.id}`);
      const details = response.data;

      if (details.status !== "PUBLISHED") {
        toast.info("This RFQ is no longer available for bidding.");
        setSelectedRfq(null);
        await fetchRfqs();
        return;
      }

      setSelectedRfq(details);
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Failed to load RFQ details.")
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  const openQuotationPage = (rfq) => {
    navigate("/vendor/quotations", {
      state: {
        rfqId: rfq.id,
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#f5eee7] p-4 text-[#54331f] sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">
              Published RFQs
            </h1>

            <p className="mt-1 text-sm text-[#8b6a52]">
              View procurement requests and submit your quotations before the deadline.
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

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[#e0cdbd] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#8b6a52]">
                Available RFQs
              </p>

              <FileText size={22} className="text-[#6f452c]" />
            </div>

            <p className="mt-2 text-3xl font-bold">
              {rfqs.length}
            </p>

            <p className="mt-1 text-xs text-[#8b6a52]">
              Published requests on this page
            </p>
          </div>

          <div className="rounded-xl border border-[#e0cdbd] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#8b6a52]">
                Current Page
              </p>

              <Package size={22} className="text-[#6f452c]" />
            </div>

            <p className="mt-2 text-3xl font-bold">{page}</p>

            <p className="mt-1 text-xs text-[#8b6a52]">
              Browse available procurement requests
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="rounded-xl border border-[#e0cdbd] bg-white p-4 shadow-sm">
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
              placeholder="Search published RFQs..."
              className={`${inputClass} pl-10`}
            />
          </div>
        </div>

        {/* RFQ List */}
        <div className="overflow-hidden rounded-xl border border-[#e0cdbd] bg-white shadow-sm">
          <div className="border-b border-[#eadbcf] px-5 py-4">
            <h2 className="font-semibold">
              Available Procurement Requests
            </h2>
          </div>

          {loading ? (
            <div className="p-10 text-center text-[#8b6a52]">
              Loading published RFQs...
            </div>
          ) : rfqs.length === 0 ? (
            <div className="p-10 text-center">
              <FileText
                size={40}
                className="mx-auto mb-3 text-[#c9ad98]"
              />

              <h3 className="font-semibold">
                No published RFQs found
              </h3>

              <p className="mt-2 text-sm text-[#8b6a52]">
                Published procurement requests will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="bg-[#f5eee7] text-[#6f452c]">
                  <tr>
                    <th className="px-4 py-3">RFQ Number</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Deadline</th>
                    <th className="px-4 py-3">Items</th>
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

                      <td className="max-w-[240px] px-4 py-4">
                        <p className="truncate font-medium">
                          {rfq.title}
                        </p>

                        <p className="mt-1 truncate text-xs text-[#8b6a52]">
                          {rfq.description || "No description"}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <CalendarDays
                            size={15}
                            className="shrink-0 text-[#8b6a52]"
                          />

                          {formatDate(rfq.submission_deadline)}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        {rfq.items?.length ?? "View details"}
                      </td>

                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full bg-[#eadbcf] px-3 py-1 text-xs font-semibold text-[#54331f]">
                          PUBLISHED
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => viewRfq(rfq)}
                            title="View RFQ details"
                            className="rounded-lg border border-[#d6c0ad] p-2 hover:bg-[#f5eee7]"
                          >
                            <Eye size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => openQuotationPage(rfq)}
                            className={buttonClass}
                          >
                            Submit Quotation
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
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
                disabled={!hasMore || loading}
                onClick={() => setPage((previous) => previous + 1)}
                className="rounded-lg border border-[#d6c0ad] px-3 py-2 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* RFQ Details Modal */}
        {selectedRfq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-6">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-[#eadbcf] px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold">
                    {selectedRfq.rfq_number ||
                      `RFQ-${selectedRfq.id}`}
                  </h2>

                  <p className="text-sm text-[#8b6a52]">
                    {selectedRfq.title}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedRfq(null)}
                  className="rounded-lg p-2 hover:bg-[#f5eee7]"
                  aria-label="Close RFQ details"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-5 p-5">
                {detailsLoading ? (
                  <p className="text-center text-[#8b6a52]">
                    Loading details...
                  </p>
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-lg bg-[#f5eee7] p-4">
                        <p className="text-sm text-[#8b6a52]">
                          Submission Deadline
                        </p>

                        <p className="mt-2 font-semibold">
                          {formatDate(
                            selectedRfq.submission_deadline
                          )}
                        </p>
                      </div>

                      <div className="rounded-lg bg-[#f5eee7] p-4">
                        <p className="text-sm text-[#8b6a52]">
                          Required Delivery Date
                        </p>

                        <p className="mt-2 font-semibold">
                          {formatDate(
                            selectedRfq.required_delivery_date
                          )}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-2 font-semibold">
                        Description
                      </h3>

                      <p className="whitespace-pre-wrap text-sm text-[#8b6a52]">
                        {selectedRfq.description ||
                          "No description provided."}
                      </p>
                    </div>

                    <div>
                      <h3 className="mb-2 font-semibold">
                        Terms and Conditions
                      </h3>

                      <p className="whitespace-pre-wrap text-sm text-[#8b6a52]">
                        {selectedRfq.terms_and_conditions ||
                          "No terms and conditions provided."}
                      </p>
                    </div>

                    {selectedRfq.attachment_url && (
                      <a
                        href={selectedRfq.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-medium text-[#6f452c] underline"
                      >
                        <FileText size={16} />
                        View RFQ Attachment
                        <ExternalLink size={14} />
                      </a>
                    )}

                    <div>
                      <h3 className="mb-3 font-semibold">
                        Required Items
                      </h3>

                      {(selectedRfq.items || []).length === 0 ? (
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
                              {selectedRfq.items.map((item, index) => (
                                <tr
                                  key={item.id ?? index}
                                  className="border-t border-[#eadbcf]"
                                >
                                  <td className="px-4 py-3">
                                    <p className="font-medium">
                                      {item.item_name}
                                    </p>

                                    {item.description && (
                                      <p className="mt-1 text-xs text-[#8b6a52]">
                                        {item.description}
                                      </p>
                                    )}
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
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap justify-end gap-3 border-t border-[#eadbcf] pt-4">
                      <button
                        type="button"
                        onClick={() => setSelectedRfq(null)}
                        className="rounded-lg border border-[#d6c0ad] px-4 py-2 text-sm hover:bg-[#f5eee7]"
                      >
                        Close
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const rfq = selectedRfq;
                          setSelectedRfq(null);
                          openQuotationPage(rfq);
                        }}
                        className={buttonClass}
                      >
                        Submit Quotation
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RFQs;