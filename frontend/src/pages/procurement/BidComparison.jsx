
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  ClipboardCheck,
  RefreshCw,
  Search,
  Save,
  X,
  Eye,
} from "lucide-react";
import API from "../../api/axios";

const initialForm = {
  price_score: "0",
  delivery_score: "0",
  compliance_score: "0",
  comments: "",
  recommendation: "PENDING",
};

const recommendations = [
  "PENDING",
  "SHORTLISTED",
  "RECOMMENDED",
  "REJECTED",
];

function BidComparison() {
  const [quotations, setQuotations] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [form, setForm] = useState({ ...initialForm });
  const [recommendationFilter, setRecommendationFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const limit = 10;

  const fetchData = async () => {
    try {
      setLoading(true);

      const [quotationResponse, evaluationResponse] =
        await Promise.all([
          API.get("/quotations/", {
            params: { page: 1, limit: 100 },
          }),
          API.get("/evaluations/", {
            params: { page: 1, limit: 100 },
          }),
        ]);

      if (!Array.isArray(quotationResponse.data)) {
        throw new Error("Invalid quotations response.");
      }

      if (!Array.isArray(evaluationResponse.data)) {
        throw new Error("Invalid evaluations response.");
      }

      setQuotations(quotationResponse.data);
      setEvaluations(evaluationResponse.data);
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          error.message ||
          "Failed to load bid evaluation data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const evaluationByQuotation = new Map(
    evaluations.map((item) => [Number(item.quotation_id), item])
  );

  const rows = quotations
    .filter((quotation) => {
      const evaluation = evaluationByQuotation.get(
        Number(quotation.id)
      );

      if (
        recommendationFilter &&
        (evaluation?.recommendation || "NOT_EVALUATED") !==
          recommendationFilter
      ) {
        return false;
      }

      const searchText = search.trim().toLowerCase();

      if (!searchText) return true;

      return (
        String(quotation.quotation_number || "")
          .toLowerCase()
          .includes(searchText) ||
        String(quotation.rfq_id || "")
          .toLowerCase()
          .includes(searchText) ||
        String(quotation.id).includes(searchText)
      );
    })
    .sort((a, b) => Number(b.id) - Number(a.id));

  const totalPages = Math.max(1, Math.ceil(rows.length / limit));

  const paginatedRows = rows.slice(
    (page - 1) * limit,
    page * limit
  );

  const openEvaluation = (quotation) => {
    const evaluation = evaluationByQuotation.get(
      Number(quotation.id)
    );

    setSelectedQuotation(quotation);

    setForm({
      price_score: String(evaluation?.price_score ?? "0"),
      delivery_score: String(evaluation?.delivery_score ?? "0"),
      compliance_score: String(evaluation?.compliance_score ?? "0"),
      comments: evaluation?.comments ?? "",
      recommendation: evaluation?.recommendation ?? "PENDING",
    });
  };

  const closeForm = () => {
    if (saving) return;

    setSelectedQuotation(null);
    setForm({ ...initialForm });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleEvaluate = async (event) => {
    event.preventDefault();

    if (!selectedQuotation) {
      toast.error("Please select a quotation.");
      return;
    }

    const scores = [
      Number(form.price_score),
      Number(form.delivery_score),
      Number(form.compliance_score),
    ];

    if (
      scores.some(
        (score) =>
          !Number.isFinite(score) ||
          score < 0 ||
          score > 100
      )
    ) {
      toast.error("Each score must be between 0 and 100.");
      return;
    }

    if (!recommendations.includes(form.recommendation)) {
      toast.error("Select a valid recommendation.");
      return;
    }

    try {
      setSaving(true);

      await API.patch(
        `/evaluations/quotations/${selectedQuotation.id}/evaluate`,
        {
          price_score: scores[0],
          delivery_score: scores[1],
          compliance_score: scores[2],
          comments: form.comments.trim() || null,
          recommendation: form.recommendation,
        }
      );

      toast.success("Evaluation saved successfully!");

      setSelectedQuotation(null);
      setForm({ ...initialForm });

      await fetchData();
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          "Failed to save evaluation."
      );
    } finally {
      setSaving(false);
    }
  };

  const getTotalScore = () => {
    const scores = [
      Number(form.price_score),
      Number(form.delivery_score),
      Number(form.compliance_score),
    ];

    if (scores.some((score) => !Number.isFinite(score))) {
      return "0.00";
    }

    return (
      scores.reduce((total, score) => total + score, 0) / 3
    ).toFixed(2);
  };

  const getRecommendationStyle = (recommendation) => {
    if (recommendation === "RECOMMENDED") {
      return "bg-[#eadbcf] text-[#54331f]";
    }

    if (recommendation === "SHORTLISTED") {
      return "bg-white text-[#6f452c] border border-[#c9ad98]";
    }

    if (recommendation === "REJECTED") {
      return "bg-[#f5eee7] text-[#8b6a52]";
    }

    return "bg-[#f5eee7] text-[#8b6a52]";
  };

  const handleFilterChange = (event) => {
    setRecommendationFilter(event.target.value);
    setPage(1);
  };

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-[#f5eee7] p-4 text-[#54331f] sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <ClipboardCheck
              size={30}
              className="text-[#6f452c]"
            />

            <div>
              <h1 className="text-2xl font-bold text-[#6f452c] sm:text-3xl">
                Bid Evaluation
              </h1>

              <p className="mt-1 text-sm text-[#8b6a52]">
                Review submitted quotations, compare scores, and record recommendations.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#6f452c] px-4 py-2.5 font-semibold text-white hover:bg-[#54331f] disabled:opacity-60"
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </div>

        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-[#d6c0ad] bg-white p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b6a52]"
            />

            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search quotation number or RFQ ID..."
              className="w-full rounded-lg border border-[#d6c0ad] py-2.5 pl-10 pr-4 outline-none focus:border-[#6f452c]"
            />
          </div>

          <select
            value={recommendationFilter}
            onChange={handleFilterChange}
            className="w-full rounded-lg border border-[#d6c0ad] bg-white px-4 py-2.5 outline-none focus:border-[#6f452c] md:w-64"
          >
            <option value="">All Recommendations</option>
            <option value="NOT_EVALUATED">Not Evaluated</option>

            {recommendations.map((recommendation) => (
              <option key={recommendation} value={recommendation}>
                {recommendation}
              </option>
            ))}
          </select>
        </div>

        {selectedQuotation && (
          <div className="mb-6 rounded-xl border border-[#d6c0ad] bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-[#6f452c]">
                  {evaluationByQuotation.has(
                    Number(selectedQuotation.id)
                  )
                    ? "Edit Evaluation"
                    : "Evaluate Quotation"}
                </h2>

                <p className="mt-1 text-sm text-[#8b6a52]">
                  Quotation: {selectedQuotation.quotation_number}
                </p>

                <p className="text-sm text-[#8b6a52]">
                  RFQ ID: {selectedQuotation.rfq_id}
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close evaluation form"
                className="rounded-lg p-2 hover:bg-[#f5eee7] disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEvaluate} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {[
                  ["price_score", "Price Score"],
                  ["delivery_score", "Delivery Score"],
                  ["compliance_score", "Compliance Score"],
                ].map(([name, label]) => (
                  <div key={name}>
                    <label
                      htmlFor={name}
                      className="mb-2 block text-sm font-semibold text-[#6f452c]"
                    >
                      {label} (0–100)
                    </label>

                    <input
                      id={name}
                      type="number"
                      name={name}
                      min="0"
                      max="100"
                      step="0.01"
                      value={form[name]}
                      onChange={handleChange}
                      required
                      disabled={saving}
                      className="w-full rounded-lg border border-[#d6c0ad] px-4 py-3 outline-none focus:border-[#6f452c] disabled:bg-[#f5eee7]"
                    />
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-[#d6c0ad] bg-[#f5eee7] p-4">
                <p className="text-sm text-[#8b6a52]">
                  Calculated Average Score
                </p>

                <p className="mt-1 text-2xl font-bold text-[#6f452c]">
                  {getTotalScore()} / 100
                </p>
              </div>

              <div>
                <label
                  htmlFor="recommendation"
                  className="mb-2 block text-sm font-semibold text-[#6f452c]"
                >
                  Recommendation
                </label>

                <select
                  id="recommendation"
                  name="recommendation"
                  value={form.recommendation}
                  onChange={handleChange}
                  required
                  disabled={saving}
                  className="w-full rounded-lg border border-[#d6c0ad] bg-white px-4 py-3 outline-none focus:border-[#6f452c]"
                >
                  {recommendations.map((recommendation) => (
                    <option key={recommendation} value={recommendation}>
                      {recommendation}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="comments"
                  className="mb-2 block text-sm font-semibold text-[#6f452c]"
                >
                  Evaluation Comments
                </label>

                <textarea
                  id="comments"
                  name="comments"
                  value={form.comments}
                  onChange={handleChange}
                  rows={3}
                  maxLength={1000}
                  disabled={saving}
                  placeholder="Enter evaluation comments"
                  className="w-full resize-y rounded-lg border border-[#d6c0ad] px-4 py-3 outline-none focus:border-[#6f452c]"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#6f452c] px-5 py-2.5 font-semibold text-white hover:bg-[#54331f] disabled:opacity-60"
                >
                  <Save size={17} />
                  {saving ? "Saving..." : "Save Evaluation"}
                </button>

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-lg border border-[#c9ad98] px-5 py-2.5 font-semibold text-[#6f452c] hover:bg-[#f5eee7]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-[#d6c0ad] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#eadbcf] px-5 py-4">
            <h2 className="font-bold text-[#6f452c]">
              Submitted Quotations
            </h2>

            <span className="text-sm text-[#8b6a52]">
              {rows.length} total
            </span>
          </div>

          {loading ? (
            <div className="p-10 text-center text-[#8b6a52]">
              Loading quotations...
            </div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-[#8b6a52]">
              No quotations found. Ensure a vendor has submitted a quotation to one of your RFQs.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px] text-left">
                  <thead className="bg-[#f5eee7]">
                    <tr>
                      {[
                        "Quotation Number",
                        "RFQ ID",
                        "Total Amount",
                        "Status",
                        "Total Score",
                        "Recommendation",
                        "Action",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="px-5 py-3 text-sm font-semibold text-[#6f452c]"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#eadbcf]">
                    {paginatedRows.map((quotation) => {
                      const evaluation = evaluationByQuotation.get(
                        Number(quotation.id)
                      );

                      return (
                        <tr
                          key={quotation.id}
                          className="hover:bg-[#fcf9f6]"
                        >
                          <td className="px-5 py-4 text-sm font-semibold text-[#6f452c]">
                            {quotation.quotation_number}
                          </td>

                          <td className="px-5 py-4 text-sm">
                            {quotation.rfq_id}
                          </td>

                          <td className="px-5 py-4 text-sm">
                            {Number(quotation.total_amount).toLocaleString(
                              "en-IN",
                              {
                                style: "currency",
                                currency: "INR",
                              }
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm">
                            {quotation.status || "SUBMITTED"}
                          </td>

                          <td className="px-5 py-4 text-sm font-semibold">
                            {evaluation
                              ? Number(evaluation.total_score).toFixed(2)
                              : "—"}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRecommendationStyle(
                                evaluation?.recommendation || "PENDING"
                              )}`}
                            >
                              {evaluation?.recommendation || "NOT EVALUATED"}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() => openEvaluation(quotation)}
                              className="inline-flex items-center gap-2 rounded-lg bg-[#6f452c] px-3 py-2 text-sm font-semibold text-white hover:bg-[#54331f]"
                            >
                              {evaluation ? (
                                <>
                                  <Eye size={15} />
                                  Edit
                                </>
                              ) : (
                                <>
                                  <ClipboardCheck size={15} />
                                  Evaluate
                                </>
                              )}
                            </button>
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
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-[#c9ad98] px-4 py-2 text-sm font-semibold text-[#6f452c] hover:bg-[#f5eee7] disabled:opacity-40"
                >
                  Previous
                </button>

                <span className="text-sm text-[#8b6a52]">
                  Page {page} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setPage((current) =>
                      Math.min(totalPages, current + 1)
                    )
                  }
                  disabled={page >= totalPages}
                  className="rounded-lg border border-[#c9ad98] px-4 py-2 text-sm font-semibold text-[#6f452c] hover:bg-[#f5eee7] disabled:opacity-40"
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

export default BidComparison;
