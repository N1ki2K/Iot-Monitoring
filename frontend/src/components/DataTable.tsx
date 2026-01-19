import { useState, useEffect, useCallback } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../api';
import type { Reading, PaginatedResponse } from '../types';

interface DataTableProps {
  selectedDevice?: string;
}

type SortField = 'ts' | 'device_id' | 'temperature_c' | 'humidity_pct' | 'lux' | 'sound' | 'co2_ppm';
type SortOrder = 'ASC' | 'DESC';

const columns: Array<{ key: SortField; label: string; format?: (val: any) => string }> = [
  { key: 'ts', label: 'Timestamp', format: (val) => new Date(val).toLocaleString() },
  { key: 'device_id', label: 'Device' },
  { key: 'temperature_c', label: 'Temp (°C)', format: (val) => parseFloat(val).toFixed(1) },
  { key: 'humidity_pct', label: 'Humidity (%)', format: (val) => parseFloat(val).toFixed(1) },
  { key: 'lux', label: 'Light (lux)', format: (val) => parseFloat(val).toFixed(0) },
  { key: 'sound', label: 'Sound', format: (val) => val?.toString() || '0' },
  { key: 'co2_ppm', label: 'Air Quality', format: (val) => val?.toString() || '-' },
];

export function DataTable({ selectedDevice }: DataTableProps) {
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
          <h3 className="text-lg font-semibold text-gray-200">Sensor Readings</h3>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search devices..."
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
                    <span>{col.label}</span>
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
                  No readings found
                </td>
              </tr>
            ) : (
              data?.data.map((reading) => (
                <tr key={reading.id}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.format
                        ? col.format(reading[col.key as keyof Reading])
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
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, data.pagination.total)} of{' '}
              <span className="text-gray-300">{data.pagination.total}</span> readings
            </>
          ) : (
            'Loading...'
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
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }

              return (
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
              );
            })}
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
}

export default DataTable;
