/**
 * Shared pagination control used by CommunitySurveysPage, MarineAreasPage,
 * MonitoringPage and any future list views.
 *
 * Props:
 *   pagination  – { total, pages, page }  (shape returned by firestore paginate())
 *   filters     – current filter state object (must include a `page` field)
 *   setFilters  – state setter for filters
 *   showTotal   – if false, hides the "Page X of Y — N records" label (default true)
 */
export default function Pagination({ pagination, filters, setFilters, showTotal = true }) {
  if (!pagination?.pages || pagination.pages <= 1) return null;

  const visiblePages = Array.from(
    { length: Math.min(pagination.pages, 5) },
    (_, i) => i + 1,
  );

  return (
    <div className="flex items-center justify-between text-sm text-gray-500 pt-2">
      {showTotal && (
        <span>
          Page {filters.page} of {pagination.pages}
          {pagination.total != null && <> &mdash; {pagination.total} records</>}
        </span>
      )}

      <div className="flex gap-1 ml-auto">
        <button
          disabled={filters.page <= 1}
          onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
          className="px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-40"
        >
          Prev
        </button>

        {visiblePages.map(p => (
          <button
            key={p}
            onClick={() => setFilters(f => ({ ...f, page: p }))}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              filters.page === p
                ? 'bg-ocean-700 text-white'
                : 'border bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {p}
          </button>
        ))}

        <button
          disabled={filters.page >= pagination.pages}
          onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
          className="px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
