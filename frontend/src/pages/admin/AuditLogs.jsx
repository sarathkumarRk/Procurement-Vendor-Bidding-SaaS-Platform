import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  ClipboardList,
  RefreshCw,
  Search,
  RotateCcw,
} from "lucide-react";
import API from "../../api/axios";

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [userId, setUserId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [appliedFilters, setAppliedFilters] = useState({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const limit = 10;

  const fetchAuditLogs = async (filters = appliedFilters, currentPage = page) => {
    try {
      setLoading(true);

      const params = {
        page: currentPage,
        limit,
      };

      if (filters.action) params.action = filters.action;
      if (filters.entity_type) params.entity_type = filters.entity_type;
      if (filters.user_id) params.user_id = filters.user_id;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;

      const response = await API.get("/audit-logs/", { params });

      if (!Array.isArray(response.data)) {
        throw new Error("Invalid audit logs response.");
      }

      setLogs(response.data);
      setHasMore(response.data.length === limit);
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Failed to load audit logs."
      );
      setLogs([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs(appliedFilters, page);
  }, [page, appliedFilters]);

  const handleSearch = (event) => {
    event.preventDefault();

    if (startDate && endDate && startDate > endDate) {
      toast.error("Start date cannot be after end date.");
      return;
    }

    const filters = {
      action: action.trim(),
      entity_type: entityType.trim(),
      user_id: userId.trim(),
      start_date: startDate
        ? `${startDate}T00:00:00`
        : "",
      end_date: endDate
        ? `${endDate}T23:59:59`
        : "",
    };

    setPage(1);
    setAppliedFilters(filters);
  };

  const handleReset = () => {
    setAction("");
    setEntityType("");
    setUserId("");
    setStartDate("");
    setEndDate("");
    setPage(1);
    setAppliedFilters({});
  };

  const formatDate = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString("en-IN");
  };

  return (
    <div className="min-h-screen bg-[#f5eee7] p-4 text-[#54331f] sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <ClipboardList size={30} className="text-[#6f452c]" />

            <div>
              <h1 className="text-2xl font-bold text-[#6f452c] sm:text-3xl">
                Audit Logs
              </h1>

              <p className="mt-1 text-sm text-[#8b6a52]">
                Monitor recorded system activities and changes.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fetchAuditLogs()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#6f452c] px-4 py-2.5 font-semibold text-white hover:bg-[#54331f] disabled:opacity-60"
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </div>

        <form
          onSubmit={handleSearch}
          className="mb-6 rounded-xl border border-[#d6c0ad] bg-white p-5 shadow-sm"
        >
          <div className="mb-5 flex items-center gap-2">
            <Search size={19} className="text-[#6f452c]" />

            <h2 className="font-bold text-[#6f452c]">
              Filter Audit Logs
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label
                htmlFor="action"
                className="mb-2 block text-sm font-semibold text-[#6f452c]"
              >
                Action
              </label>

              <input
                id="action"
                type="text"
                value={action}
                onChange={(event) => setAction(event.target.value)}
                placeholder="Enter action"
                className="w-full rounded-lg border border-[#d6c0ad] px-3 py-2.5 outline-none focus:border-[#6f452c]"
              />
            </div>

            <div>
              <label
                htmlFor="entity-type"
                className="mb-2 block text-sm font-semibold text-[#6f452c]"
              >
                Entity Type
              </label>

              <input
                id="entity-type"
                type="text"
                value={entityType}
                onChange={(event) => setEntityType(event.target.value)}
                placeholder="Enter entity type"
                className="w-full rounded-lg border border-[#d6c0ad] px-3 py-2.5 outline-none focus:border-[#6f452c]"
              />
            </div>

            <div>
              <label
                htmlFor="user-id"
                className="mb-2 block text-sm font-semibold text-[#6f452c]"
              >
                User ID
              </label>

              <input
                id="user-id"
                type="number"
                min="1"
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
                placeholder="Enter user ID"
                className="w-full rounded-lg border border-[#d6c0ad] px-3 py-2.5 outline-none focus:border-[#6f452c]"
              />
            </div>

            <div>
              <label
                htmlFor="start-date"
                className="mb-2 block text-sm font-semibold text-[#6f452c]"
              >
                Start Date
              </label>

              <input
                id="start-date"
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full rounded-lg border border-[#d6c0ad] px-3 py-2.5 outline-none focus:border-[#6f452c]"
              />
            </div>

            <div>
              <label
                htmlFor="end-date"
                className="mb-2 block text-sm font-semibold text-[#6f452c]"
              >
                End Date
              </label>

              <input
                id="end-date"
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full rounded-lg border border-[#d6c0ad] px-3 py-2.5 outline-none focus:border-[#6f452c]"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-[#6f452c] px-5 py-2.5 font-semibold text-white hover:bg-[#54331f]"
            >
              <Search size={16} />
              Apply Filters
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-lg border border-[#c9ad98] px-5 py-2.5 font-semibold text-[#6f452c] hover:bg-[#f5eee7]"
            >
              <RotateCcw size={16} />
              Reset
            </button>
          </div>
        </form>

        <div className="overflow-hidden rounded-xl border border-[#d6c0ad] bg-white shadow-sm">
          <div className="border-b border-[#eadbcf] px-5 py-4">
            <h2 className="font-bold text-[#6f452c]">
              Activity Records
            </h2>
          </div>

          {loading ? (
            <div className="p-10 text-center text-[#8b6a52]">
              Loading audit logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="p-10 text-center text-[#8b6a52]">
              No audit logs found.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left">
                  <thead className="bg-[#f5eee7]">
                    <tr>
                      <th className="px-5 py-3 text-sm font-semibold text-[#6f452c]">
                        ID
                      </th>

                      <th className="px-5 py-3 text-sm font-semibold text-[#6f452c]">
                        User ID
                      </th>

                      <th className="px-5 py-3 text-sm font-semibold text-[#6f452c]">
                        Action
                      </th>

                      <th className="px-5 py-3 text-sm font-semibold text-[#6f452c]">
                        Entity Type
                      </th>

                      <th className="px-5 py-3 text-sm font-semibold text-[#6f452c]">
                        Entity ID
                      </th>

                      <th className="px-5 py-3 text-sm font-semibold text-[#6f452c]">
                        Created At
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#eadbcf]">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#fcf9f6]">
                        <td className="px-5 py-4 text-sm">
                          {log.id ?? "—"}
                        </td>

                        <td className="px-5 py-4 text-sm">
                          {log.user_id ?? "—"}
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-[#6f452c]">
                          {log.action || "—"}
                        </td>

                        <td className="px-5 py-4 text-sm">
                          {log.entity_type || "—"}
                        </td>

                        <td className="px-5 py-4 text-sm">
                          {log.entity_id ?? "—"}
                        </td>

                        <td className="px-5 py-4 text-sm text-[#8b6a52]">
                          {formatDate(log.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-[#eadbcf] px-5 py-4">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
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
      </div>
    </div>
  );
}

export default AuditLogs;