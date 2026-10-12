import { useEffect, useState } from "react";
import {
  RefreshCw,
  Search,
  Eye,
  X,
  CheckCircle,
  PackageCheck,
} from "lucide-react";
import API from "../../api/axios";
import { toast } from "react-toastify";

const inputClass =
  "w-full rounded-lg border border-[#d6c0ad] bg-white px-3 py-2 text-sm text-[#54331f] outline-none focus:border-[#6f452c]";

const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#6f452c] px-4 py-2 text-sm font-medium text-white hover:bg-[#54331f] disabled:cursor-not-allowed disabled:opacity-50";

function getError(error, fallback) {
  const detail = error.response?.data?.detail;

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).join(", ");
  }

  return detail || fallback;
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString();
}

function formatAmount(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function PurchaseOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingOrderId, setProcessingOrderId] = useState(null);
  const [page, setPage] = useState(1);
  const limit = 10;

  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);

    try {
      const params = { page, limit };

      if (statusFilter) {
        params.status = statusFilter;
      }

      const response = await API.get("/purchase-orders/", {
        params,
      });

      const data = response.data;

      setOrders(
        Array.isArray(data)
          ? data
          : data.items || data.purchase_orders || []
      );
    } catch (error) {
      toast.error(
        getError(error, "Failed to load purchase orders.")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter]);

  const viewOrder = async (order) => {
    try {
      const response = await API.get(
        `/purchase-orders/${order.id}`
      );

      setSelectedOrder(response.data);
    } catch (error) {
      toast.error(
        getError(error, "Failed to load purchase order details.")
      );
    }
  };

  const confirmReceipt = async (order) => {
    if (processing) return;

    if (order.status !== "SENT_TO_VENDOR") {
      toast.error(
        "Only purchase orders issued to you can be confirmed."
      );
      return;
    }

    const confirmed = window.confirm(
      `Confirm receipt of purchase order ${order.po_number}?`
    );

    if (!confirmed) return;

    setProcessing(true);
    setProcessingOrderId(order.id);

    try {
      // This endpoint must be implemented in the FastAPI backend.
      const response = await API.post(
        `/purchase-orders/${order.id}/confirm-receipt`
      );

      const updatedOrder = response.data;

      setSelectedOrder((previous) =>
        previous && previous.id === order.id
          ? { ...previous, ...updatedOrder }
          : previous
      );

      toast.success("Purchase order receipt confirmed successfully.");

      await fetchOrders();
    } catch (error) {
      toast.error(
        getError(
          error,
          "Could not confirm receipt. Please try again."
        )
      );
    } finally {
      setProcessing(false);
      setProcessingOrderId(null);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const term = search.trim().toLowerCase();

    return (
      String(order.po_number || "").toLowerCase().includes(term) ||
      String(order.id || "").includes(term) ||
      String(order.quotation_id || "").includes(term)
    );
  });

  const statusStyle = (status) => {
    const styles = {
      SENT_TO_VENDOR: "bg-[#e5d5c8] text-[#54331f]",
      FULFILLED: "bg-[#eadbcf] text-[#54331f]",
      CANCELLED: "bg-red-100 text-red-800",
    };

    return styles[status] || "bg-[#f5eee7] text-[#6f452c]";
  };

  const receiptConfirmed = (order) =>
    Boolean(order.receipt_confirmed_at);

  return (
    <div className="min-h-screen bg-[#f5eee7] p-4 text-[#54331f] sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">
              Purchase Orders
            </h1>
            <p className="mt-1 text-sm text-[#8b6a52]">
              View issued purchase orders and track their status.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchOrders}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#d6c0ad] bg-white px-4 py-2 text-sm hover:bg-[#f5eee7] disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-[#e0cdbd] bg-white p-5 shadow-sm">
            <p className="text-sm text-[#8b6a52]">
              Orders on this page
            </p>
            <p className="mt-2 text-3xl font-bold">
              {orders.length}
            </p>
          </div>

          <div className="rounded-xl border border-[#e0cdbd] bg-white p-5 shadow-sm">
            <p className="text-sm text-[#8b6a52]">
              Issued to Vendor
            </p>
            <p className="mt-2 text-3xl font-bold">
              {
                orders.filter(
                  (order) => order.status === "SENT_TO_VENDOR"
                ).length
              }
            </p>
          </div>

          <div className="rounded-xl border border-[#e0cdbd] bg-white p-5 shadow-sm">
            <p className="text-sm text-[#8b6a52]">
              Receipts Confirmed
            </p>
            <p className="mt-2 text-3xl font-bold">
              {orders.filter(receiptConfirmed).length}
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
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search PO number or quotation ID..."
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
              <option value="SENT_TO_VENDOR">Sent to Vendor</option>
              <option value="FULFILLED">Fulfilled</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#e0cdbd] bg-white shadow-sm">
          <div className="border-b border-[#eadbcf] px-5 py-4">
            <h2 className="font-semibold">Purchase Order List</h2>
          </div>

          {loading ? (
            <div className="p-10 text-center text-[#8b6a52]">
              Loading purchase orders...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-10 text-center text-[#8b6a52]">
              No purchase orders found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="bg-[#f5eee7] text-[#6f452c]">
                  <tr>
                    <th className="px-4 py-3">PO Number</th>
                    <th className="px-4 py-3">Quotation ID</th>
                    <th className="px-4 py-3">Total Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Receipt</th>
                    <th className="px-4 py-3">Issued At</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-t border-[#eadbcf] hover:bg-[#fcf9f6]"
                    >
                      <td className="px-4 py-4 font-medium">
                        {order.po_number || `PO-${order.id}`}
                      </td>

                      <td className="px-4 py-4">
                        {order.quotation_id ?? "—"}
                      </td>

                      <td className="px-4 py-4">
                        ₹{formatAmount(order.total_amount)}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(order.status)}`}
                        >
                          {order.status?.replaceAll("_", " ") || "—"}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        {receiptConfirmed(order) ? (
                          <span className="text-xs font-semibold text-green-700">
                            Confirmed
                          </span>
                        ) : (
                          <span className="text-xs text-[#8b6a52]">
                            Pending
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {formatDate(order.issued_at)}
                      </td>

                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => viewOrder(order)}
                          title="View purchase order"
                          className="rounded-lg border border-[#d6c0ad] p-2 hover:bg-[#f5eee7]"
                        >
                          <Eye size={16} />
                        </button>
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
                disabled={orders.length < limit || loading}
                onClick={() => setPage((previous) => previous + 1)}
                className="rounded-lg border border-[#d6c0ad] px-3 py-2 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-6">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-[#eadbcf] px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold">
                    {selectedOrder.po_number}
                  </h2>
                  <p className="text-sm text-[#8b6a52]">
                    Purchase order details
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="rounded-lg p-2 hover:bg-[#f5eee7]"
                  aria-label="Close details"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-5 p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg bg-[#f5eee7] p-4">
                    <p className="text-sm text-[#8b6a52]">Status</p>
                    <p className="mt-1 font-semibold">
                      {selectedOrder.status?.replaceAll("_", " ")}
                    </p>
                  </div>

                  <div className="rounded-lg bg-[#f5eee7] p-4">
                    <p className="text-sm text-[#8b6a52]">
                      Total Amount
                    </p>
                    <p className="mt-1 font-semibold">
                      ₹{formatAmount(selectedOrder.total_amount)}
                    </p>
                  </div>

                  <div className="rounded-lg bg-[#f5eee7] p-4">
                    <p className="text-sm text-[#8b6a52]">
                      Quotation ID
                    </p>
                    <p className="mt-1 font-semibold">
                      {selectedOrder.quotation_id}
                    </p>
                  </div>

                  <div className="rounded-lg bg-[#f5eee7] p-4">
                    <p className="text-sm text-[#8b6a52]">
                      Issued At
                    </p>
                    <p className="mt-1 font-semibold">
                      {formatDate(selectedOrder.issued_at)}
                    </p>
                  </div>

                  <div className="rounded-lg bg-[#f5eee7] p-4 sm:col-span-2">
                    <p className="text-sm text-[#8b6a52]">
                      Receipt Confirmation
                    </p>
                    <p className="mt-1 font-semibold">
                      {receiptConfirmed(selectedOrder)
                        ? `Confirmed at ${formatDate(selectedOrder.receipt_confirmed_at)}`
                        : "Not confirmed yet"}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 font-semibold">Order Items</h3>

                  {(selectedOrder.items || []).length === 0 ? (
                    <p className="text-sm text-[#8b6a52]">
                      No item details were returned by the API.
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-[#eadbcf]">
                      <table className="w-full min-w-[500px] text-left text-sm">
                        <thead className="bg-[#f5eee7]">
                          <tr>
                            <th className="px-4 py-3">Item</th>
                            <th className="px-4 py-3">Quantity</th>
                            <th className="px-4 py-3">Unit Price</th>
                            <th className="px-4 py-3">Line Total</th>
                          </tr>
                        </thead>

                        <tbody>
                          {selectedOrder.items.map((item, index) => (
                            <tr
                              key={item.id || index}
                              className="border-t border-[#eadbcf]"
                            >
                              <td className="px-4 py-3">
                                {item.item_name || "—"}
                              </td>
                              <td className="px-4 py-3">
                                {item.quantity ?? "—"}
                              </td>
                              <td className="px-4 py-3">
                                ₹{formatAmount(item.unit_price)}
                              </td>
                              <td className="px-4 py-3">
                                ₹{formatAmount(item.line_total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {selectedOrder.status === "SENT_TO_VENDOR" && (
                  <div className="rounded-lg border border-[#e0cdbd] bg-[#fcf9f6] p-4">
                    <div className="flex items-start gap-3">
                      <PackageCheck
                        size={22}
                        className="mt-1 text-[#6f452c]"
                      />
                      <div>
                        <h3 className="font-semibold">
                          Confirm Receipt
                        </h3>
                        <p className="mt-1 text-sm text-[#8b6a52]">
                          Confirm that you have received this purchase order.
                          This records receipt confirmation separately from
                          order fulfilment.
                        </p>
                      </div>
                    </div>

                    {receiptConfirmed(selectedOrder) ? (
                      <p className="mt-4 text-sm font-semibold text-green-700">
                        <CheckCircle size={16} className="mr-2 inline" />
                        Receipt already confirmed.
                      </p>
                    ) : (
                      <button
                        type="button"
                        disabled={processing}
                        onClick={() => confirmReceipt(selectedOrder)}
                        className={`${buttonClass} mt-4`}
                      >
                        <CheckCircle size={16} />
                        {processing &&
                        processingOrderId === selectedOrder.id
                          ? "Confirming..."
                          : "Confirm Receipt"}
                      </button>
                    )}
                  </div>
                )}

                <div className="flex justify-end border-t border-[#eadbcf] pt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className="rounded-lg border border-[#d6c0ad] px-4 py-2 text-sm hover:bg-[#f5eee7]"
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

export default PurchaseOrders;



