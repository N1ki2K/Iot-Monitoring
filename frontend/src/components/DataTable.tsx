import { memo, useState, useEffect, useCallback } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../api';
import type { Reading, PaginatedResponse } from '../types';
import { getDisplayedSound } from '../utils/readings';
import { getDisplayedAir } from '../utils/air';
import { useI18n } from '../useI18n';

interface DataTableProps {
  selectedDevice?: string;
}

type SortField = 'ts' | 'device_id' | 'temperature_c' | 'humidity_pct' | 'lux' | 'sound_est_spl' | 'air_baseline_pct';
type SortOrder = 'ASC' | 'DESC';

const columns: Array<{ key: SortField; labelKey: string; format?: (val: unknown, reading: Reading, locale: string) => string }> = [
  { key: 'ts', labelKey: 'dataTable.timestamp', format: (val, _reading, locale) => new Date(String(val)).toLocaleString(locale) },
  { key: 'device_id', labelKey: 'common.device' },
  { key: 'temperature_c', labelKey: 'dataTable.temp', format: (val) => Number.parseFloat(String(val)).toFixed(1) },
  { key: 'humidity_pct', labelKey: 'dataTable.humidity', format: (val) => Number.parseFloat(String(val)).toFixed(1) },
  { key: 'lux', labelKey: 'dataTable.light', format: (val) => Number.parseFloat(String(val)).toFixed(0) },
  { key: 'sound_est_spl', labelKey: 'dataTable.sound', format: (_val, reading) => getDisplayedSound(reading).toFixed(1) },
  { key: 'air_baseline_pct', labelKey: 'dataTable.air', format: (_val, reading) => getDisplayedAir(reading).toFixed(1) },
];

export const DataTable = memo(function DataTable({ selectedDevice }: DataTableProps) {
  const { t, locale } = useI18n();
  const [data, setData] = useState<PaginatedResponse<Reading> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('ts');
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC');
  const [page, setPage] = useState(1);
  const [limit] = useState(15);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.getReadings({
        page,
        limit,
        search,
        sortBy,
        sortOrder,
        device: selectedDevice,
      });
      setData(response);
    } catch (error) {
      console.error('Failed to fetch readings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, sortBy, sortOrder, selectedDevice]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [search, selectedDevice]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(field);
      setSortOrder('DESC');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) {
      return <ChevronsUpDown className="w-4 h-4 text-gray-600" />;
    }
    return sortOrder === 'ASC' ? (
      <ChevronUp className="w-4 h-4 text-cyan-400" />
    ) : (
      <ChevronDown className="w-4 h-4 text-cyan-400" />
    );
  };

  const totalPages = data?.pagination.totalPages || 1;

  return (
    <div className="bg-slate-800/40 rounded-xl border border-slate-700/40 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/40">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-200">{t('dataTable.title')}</h3>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder={t('dataTable.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} onClick={() => handleSort(col.key)}>
                  <div className="flex items-center gap-2">
                    <span>{t(col.labelKey)}</span>
                    <SortIcon field={col.key} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      <div className="h-4 bg-slate-700/50 rounded animate-pulse w-20" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data?.data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-gray-500">
                  {t('dataTable.noReadings')}
                </td>
              </tr>
            ) : (
              data?.data.map((reading) => (
                <tr key={reading.id}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.format
                        ? col.format(reading[col.key as keyof Reading], reading, locale)
                        : reading[col.key as keyof Reading]?.toString() || '-'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="p-4 border-t border-slate-700/40 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {data ? (
            <>
              {t('dataTable.showing', {
                from: ((page - 1) * limit) + 1,
                to: Math.min(page * limit, data.pagination.total),
                total: data.pagination.total,
              })}
            </>
          ) : (
            t('common.loading')
          )}
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
            className="btn btn-ghost p-2"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1">
            {(() => {
              const middlePages = (() => {
                if (totalPages <= 4) {
                  return Array.from({ length: totalPages }, (_, i) => i + 1);
                }
                if (page <= 2) {
                  return [1, 2, 3];
                }
                if (page >= totalPages - 1) {
                  return [totalPages - 2, totalPages - 1, totalPages];
                }
                return [page - 1, page, page + 1];
              })();
              const showLeading = totalPages > 4 && page > 2 && middlePages[0] > 1;
              const showTrailing = totalPages > 4 && page < totalPages - 1;
              const showLast = totalPages > 3 && middlePages[middlePages.length - 1] !== totalPages;

              return (
                <>
                  {showLeading && (
                    <>
                      <button
                        onClick={() => setPage(1)}
                        disabled={isLoading}
                        className={`btn px-3 py-1.5 text-sm ${
                          page === 1 ? 'bg-cyan-600 text-white' : 'btn-ghost'
                        }`}
                      >
                        1
                      </button>
                      <span className="px-2 text-sm text-gray-500">...</span>
                    </>
                  )}

                  {middlePages.map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      disabled={isLoading}
                      className={`btn px-3 py-1.5 text-sm ${
                        page === pageNum
                          ? 'bg-cyan-600 text-white'
                          : 'btn-ghost'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}

                  {showTrailing && <span className="px-2 text-sm text-gray-500">...</span>}

                  {showLast && (
                    <button
                      onClick={() => setPage(totalPages)}
                      disabled={isLoading}
                      className={`btn px-3 py-1.5 text-sm ${
                        page === totalPages
                          ? 'bg-cyan-600 text-white'
                          : 'btn-ghost'
                      }`}
                    >
                      {totalPages}
                    </button>
                  )}
                </>
              );
            })()}
          </div>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || isLoading}
            className="btn btn-ghost p-2"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
});

export default DataTable;
