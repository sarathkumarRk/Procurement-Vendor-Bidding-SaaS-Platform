import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Eye, RefreshCw } from "lucide-react";
import { toast } from "react-toastify";
import API from "../../api/axios";

function Approvals() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [status, setStatus] = useState("PENDING_APPROVAL");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [comments, setComments] = useState("");

  const loadOrders = async () => {
    try {
      setLoading(true);

      const response = await API.get("/purchase-orders/", {
        params: {
          page,
          limit,
          status: status || undefined,
        },
      });

      const data = response.data;
      setOrders(Array.isArray(data) ? data : data.items || data.results || []);
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Failed to load purchase orders."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [page, status]);

  const handleDecision = async (orderId, decision) => {
    const action = decision === "APPROVE" ? "approve" : "reject";

    if (processingId !== null) return;

    try {
      setProcessingId(orderId);

      await API.post(`/purchase-orders/${orderId}/approve`, {
        status: decision === "APPROVE" ? "APPROVED" : "REJECTED",
        comments: comments.trim() || null,
      });

      toast.success(`Purchase order ${action} request submitted.`);
      setSelectedOrder(null);
      setComments("");
      await loadOrders();
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          `Failed to ${action} purchase order.`
      );
    } finally {
      setProcessingId(null);
    }
  };

  const formatAmount = (amount) =>
    Number(amount || 0).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    });

  return (
    <div className="min-h-screen bg-[#f5eee7] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#6f452c]">
              Purchase Order Approvals
            </h1>
            <p className="mt-1 text-sm text-[#8b6a52]">
              Review purchase orders and manage approval decisions.
            </p>
          </div>

          <button
            type="button"
            onClick={loadOrders}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg bg-[#6f452c] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#54331f] disabled:opacity-60"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        <div className="mb-5 rounded-xl border border-[#d6c0ad] bg-white p-4">
          <label className="mb-2 block text-sm font-medium text-[#6f452c]">
            Filter by status
          </label>

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-[#d6c0ad] px-3 py-2 text-sm text-[#54331f] outline-none focus:border-[#6f452c] sm:w-72"
          >
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="">All Statuses</option>
          </select>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#d6c0ad] bg-white">
          {loading ? (
            <div className="p-10 text-center text-[#8b6a52]">
              Loading purchase orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="p-10 text-center text-[#8b6a52]">
              No purchase orders found.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[750px] text-left text-sm">
                  <thead className="bg-[#eadbcf] text-[#6f452c]">
                    <tr>
                      <th className="px-5 py-4 font-semibold">PO Number</th>
                      <th className="px-5 py-4 font-semibold">Vendor</th>
                      <th className="px-5 py-4 font-semibold">Amount</th>
                      <th className="px-5 py-4 font-semibold">Status</th>
                      <th className="px-5 py-4 font-semibold">Created</th>
                      <th className="px-5 py-4 font-semibold">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#eadbcf]">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-[#faf6f2]">
                        <td className="px-5 py-4 font-medium text-[#54331f]">
                          {order.po_number || `PO-${order.id}`}
                        </td>

                        <td className="px-5 py-4 text-[#6f452c]">
                          {order.vendor_name ||
                            order.vendor?.company_name ||
                            "—"}
                        </td>

                        <td className="px-5 py-4 text-[#54331f]">
                          {formatAmount(order.total_amount)}
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-full bg-[#f5eee7] px-3 py-1 text-xs font-medium text-[#6f452c]">
                            {order.status}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-[#8b6a52]">
                          {order.created_at
                            ? new Date(order.created_at).toLocaleDateString(
                                "en-IN"
                              )
                            : "—"}
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrder(order);
                              setComments("");
                            }}
                            className="flex items-center gap-1.5 rounded-lg border border-[#c9ad98] px-3 py-2 text-[#6f452c] hover:bg-[#f5eee7]"
                          >
                            <Eye size={15} />
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-[#eadbcf] px-5 py-4">
                <p className="text-sm text-[#8b6a52]">
                  Page {page}
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page === 1 || loading}
                    onClick={() => setPage((current) => current - 1)}
                    className="rounded-lg border border-[#d6c0ad] px-4 py-2 text-sm text-[#6f452c] disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <button
                    type="button"
                    disabled={orders.length < limit || loading}
                    onClick={() => setPage((current) => current + 1)}
                    className="rounded-lg border border-[#d6c0ad] px-4 py-2 text-sm text-[#6f452c] disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-xl border border-[#d6c0ad] bg-white p-6 shadow-xl">
              <h2 className="text-xl font-bold text-[#6f452c]">
                Review Purchase Order
              </h2>

              <div className="mt-4 space-y-3 rounded-lg bg-[#f5eee7] p-4 text-sm text-[#54331f]">
                <p>
                  <span className="font-semibold">PO Number:</span>{" "}
                  {selectedOrder.po_number || `PO-${selectedOrder.id}`}
                </p>

                <p>
                  <span className="font-semibold">Status:</span>{" "}
                  {selectedOrder.status}
                </p>

                <p>
                  <span className="font-semibold">Total Amount:</span>{" "}
                  {formatAmount(selectedOrder.total_amount)}
                </p>

                <p>
                  <span className="font-semibold">Vendor:</span>{" "}
                  {selectedOrder.vendor_name ||
                    selectedOrder.vendor?.company_name ||
                    "—"}
                </p>
              </div>

              {selectedOrder.status === "PENDING_APPROVAL" ? (
                <>
                  <label className="mb-2 mt-5 block text-sm font-medium text-[#6f452c]">
                    Comments (optional)
                  </label>

                  <textarea
                    value={comments}
                    onChange={(event) => setComments(event.target.value)}
                    rows={3}
                    maxLength={1000}
                    placeholder="Enter approval or rejection comments..."
                    className="w-full rounded-lg border border-[#d6c0ad] p-3 text-sm outline-none focus:border-[#6f452c]"
                  />

                  <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(null)}
                      className="rounded-lg border border-[#d6c0ad] px-4 py-2.5 text-sm text-[#6f452c]"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      disabled={processingId !== null}
                      onClick={() =>
                        handleDecision(selectedOrder.id, "REJECT")
                      }
                      className="flex items-center justify-center gap-2 rounded-lg border border-[#c9ad98] px-4 py-2.5 text-sm text-[#6f452c] hover:bg-[#f5eee7] disabled:opacity-50"
                    >
                      <XCircle size={16} />
                      Reject
                    </button>

                    <button
                      type="button"
                      disabled={processingId !== null}
                      onClick={() =>
                        handleDecision(selectedOrder.id, "APPROVE")
                      }
                      className="flex items-center justify-center gap-2 rounded-lg bg-[#6f452c] px-4 py-2.5 text-sm text-white hover:bg-[#54331f] disabled:opacity-50"
                    >
                      <CheckCircle size={16} />
                      Approve
                    </button>
                  </div>
                </>
              ) : (
                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className="rounded-lg bg-[#6f452c] px-4 py-2 text-sm text-white hover:bg-[#54331f]"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Approvals;