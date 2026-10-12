import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  Users,
  Store,
  FileText,
  ClipboardList,
  ShoppingCart,
  Clock,
  CheckCircle,
  PackageCheck,
  RefreshCw,
  Building2,
} from "lucide-react";
import API from "../../api/axios";

const initialSummary = {
  role: "ADMIN",
  total_users: 0,
  total_vendors: 0,
  total_rfqs: 0,
  published_rfqs: 0,
  closed_rfqs: 0,
  total_quotations: 0,
  total_purchase_orders: 0,
  pending_purchase_orders: 0,
  approved_purchase_orders: 0,
  fulfilled_purchase_orders: 0,
  recent_rfqs: [],
  recent_purchase_orders: [],
};

const initialPOStatistics = {
  draft: 0,
  pending_approval: 0,
  approved: 0,
  sent_to_vendor: 0,
  fulfilled: 0,
  cancelled: 0,
  total: 0,
};

function Dashboard() {
  const [summary, setSummary] = useState(initialSummary);
  const [poStatistics, setPOStatistics] = useState(initialPOStatistics);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);

      const [summaryResponse, poResponse] = await Promise.all([
        API.get("/dashboard/summary"),
        API.get("/dashboard/purchase-orders"),
      ]);

      setSummary({
        ...initialSummary,
        ...summaryResponse.data,
      });

      setPOStatistics({
        ...initialPOStatistics,
        ...poResponse.data,
      });
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          "Failed to load dashboard information."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const summaryCards = [
    {
      title: "Total Users",
      value: summary.total_users,
      icon: Users,
    },
    {
      title: "Total Vendors",
      value: summary.total_vendors,
      icon: Store,
    },
    {
      title: "Total RFQs",
      value: summary.total_rfqs,
      icon: FileText,
    },
    {
      title: "Published RFQs",
      value: summary.published_rfqs,
      icon: ClipboardList,
    },
    {
      title: "Total Quotations",
      value: summary.total_quotations,
      icon: ShoppingCart,
    },
    {
      title: "Total Purchase Orders",
      value: summary.total_purchase_orders,
      icon: PackageCheck,
    },
    {
      title: "Pending Approvals",
      value: summary.pending_purchase_orders,
      icon: Clock,
    },
    {
      title: "Approved Orders",
      value: summary.approved_purchase_orders,
      icon: CheckCircle,
    },
  ];

  const poStatusCards = [
    { title: "Draft", value: poStatistics.draft },
    {
      title: "Pending Approval",
      value: poStatistics.pending_approval,
    },
    { title: "Approved", value: poStatistics.approved },
    {
      title: "Sent to Vendor",
      value: poStatistics.sent_to_vendor,
    },
    { title: "Fulfilled", value: poStatistics.fulfilled },
    { title: "Cancelled", value: poStatistics.cancelled },
  ];

  const formatAmount = (amount) => {
    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount)) {
      return amount ?? "0";
    }

    return numericAmount.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    });
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "PUBLISHED":
      case "APPROVED":
      case "FULFILLED":
        return "border border-[#b49a82] bg-[#eadbcf] text-[#54331f]";

      case "CLOSED":
      case "CANCELLED":
        return "border border-[#c9ad98] bg-[#f5eee7] text-[#6f452c]";

      case "PENDING_APPROVAL":
      case "DRAFT":
      case "SENT_TO_VENDOR":
        return "border border-[#d6c0ad] bg-white text-[#8b6a52]";

      default:
        return "border border-[#d6c0ad] bg-white text-[#6f452c]";
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5eee7]">
        <p className="font-semibold text-[#6f452c]">
          Loading dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5eee7] p-4 text-[#54331f] sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-3">
              <Building2 size={30} className="text-[#6f452c]" />

              <h1 className="text-2xl font-bold text-[#6f452c] sm:text-3xl">
                Admin Dashboard
              </h1>
            </div>

            <p className="mt-2 text-sm text-[#8b6a52]">
              Overview of users, vendors, RFQs and purchase orders.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchDashboard}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#6f452c] px-4 py-2.5 font-semibold text-white transition hover:bg-[#54331f] disabled:opacity-60"
          >
            <RefreshCw size={17} />
            Refresh Dashboard
          </button>
        </div>

        {/* Summary Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.title}
                className="rounded-xl border border-[#d6c0ad] bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-[#8b6a52]">
                    {card.title}
                  </p>

                  <div className="rounded-lg bg-[#f5eee7] p-2.5">
                    <Icon size={21} className="text-[#6f452c]" />
                  </div>
                </div>

                <p className="mt-4 text-3xl font-bold text-[#6f452c]">
                  {card.value ?? 0}
                </p>
              </div>
            );
          })}
        </div>

        {/* Additional Statistics */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[#d6c0ad] bg-white p-5">
            <p className="text-sm text-[#8b6a52]">
              Closed RFQs
            </p>

            <p className="mt-2 text-2xl font-bold text-[#6f452c]">
              {summary.closed_rfqs ?? 0}
            </p>
          </div>

          <div className="rounded-xl border border-[#d6c0ad] bg-white p-5">
            <p className="text-sm text-[#8b6a52]">
              Fulfilled Purchase Orders
            </p>

            <p className="mt-2 text-2xl font-bold text-[#6f452c]">
              {summary.fulfilled_purchase_orders ?? 0}
            </p>
          </div>

          <div className="rounded-xl border border-[#d6c0ad] bg-white p-5">
            <p className="text-sm text-[#8b6a52]">
              Total Purchase Orders
            </p>

            <p className="mt-2 text-2xl font-bold text-[#6f452c]">
              {poStatistics.total ?? summary.total_purchase_orders ?? 0}
            </p>
          </div>
        </div>

        {/* Purchase Order Statistics */}
        <div className="mb-8 rounded-xl border border-[#d6c0ad] bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-5 text-xl font-bold text-[#6f452c]">
            Purchase Order Statistics
          </h2>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {poStatusCards.map((item) => (
              <div
                key={item.title}
                className="rounded-lg border border-[#eadbcf] bg-[#fcf9f6] p-4"
              >
                <p className="text-sm text-[#8b6a52]">
                  {item.title}
                </p>

                <p className="mt-2 text-2xl font-bold text-[#6f452c]">
                  {item.value ?? 0}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent RFQs */}
        <div className="mb-8 overflow-hidden rounded-xl border border-[#d6c0ad] bg-white shadow-sm">
          <div className="border-b border-[#eadbcf] px-5 py-4">
            <h2 className="text-lg font-bold text-[#6f452c]">
              Recent RFQs
            </h2>
          </div>

          {!summary.recent_rfqs?.length ? (
            <p className="p-8 text-center text-sm text-[#8b6a52]">
              No RFQs available.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-left">
                <thead className="bg-[#f5eee7]">
                  <tr>
                    <th className="px-5 py-3 text-sm font-semibold text-[#6f452c]">
                      ID
                    </th>

                    <th className="px-5 py-3 text-sm font-semibold text-[#6f452c]">
                      RFQ Title
                    </th>

                    <th className="px-5 py-3 text-sm font-semibold text-[#6f452c]">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#eadbcf]">
                  {summary.recent_rfqs.map((rfq) => (
                    <tr key={rfq.id} className="hover:bg-[#fcf9f6]">
                      <td className="px-5 py-4 text-sm">
                        {rfq.id}
                      </td>

                      <td className="px-5 py-4 text-sm font-medium text-[#6f452c]">
                        {rfq.title || `RFQ #${rfq.id}`}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(
                            rfq.status
                          )}`}
                        >
                          {rfq.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Purchase Orders */}
        <div className="overflow-hidden rounded-xl border border-[#d6c0ad] bg-white shadow-sm">
          <div className="border-b border-[#eadbcf] px-5 py-4">
            <h2 className="text-lg font-bold text-[#6f452c]">
              Recent Purchase Orders
            </h2>
          </div>

          {!summary.recent_purchase_orders?.length ? (
            <p className="p-8 text-center text-sm text-[#8b6a52]">
              No purchase orders available.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left">
                <thead className="bg-[#f5eee7]">
                  <tr>
                    <th className="px-5 py-3 text-sm font-semibold text-[#6f452c]">
                      ID
                    </th>

                    <th className="px-5 py-3 text-sm font-semibold text-[#6f452c]">
                      PO Number
                    </th>

                    <th className="px-5 py-3 text-sm font-semibold text-[#6f452c]">
                      Status
                    </th>

                    <th className="px-5 py-3 text-right text-sm font-semibold text-[#6f452c]">
                      Total Amount
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#eadbcf]">
                  {summary.recent_purchase_orders.map((po) => (
                    <tr key={po.id} className="hover:bg-[#fcf9f6]">
                      <td className="px-5 py-4 text-sm">
                        {po.id}
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-[#6f452c]">
                        {po.po_number || `PO #${po.id}`}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(
                            po.status
                          )}`}
                        >
                          {po.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right text-sm font-semibold text-[#6f452c]">
                        {formatAmount(po.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default Dashboard;