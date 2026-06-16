import React, { useMemo, useState, useRef, useEffect } from 'react';
import { SheetData } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { AlertCircle, Activity, ArrowRight, ServerCrash, Users, Search, Download } from 'lucide-react';
import { findColumnByKeywords, COL_KEYWORDS, getIssueCategory, summarizeText } from '../utils/telecomMappings';

function MultiSelect({ title, options, selected, onChange, className = '' }: any) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
    }
  }, [open]);

  const toggleOption = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((o: string) => o !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  const displayText = selected.length === 0 ? title : selected.length === 1 ? (selected[0].length > 20 ? selected[0].substring(0,20)+'...' : selected[0]) : `${title} (${selected.length})`;

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.trim().toLowerCase();
    return options.filter((opt: any) => opt.name.toLowerCase().includes(query));
  }, [options, searchQuery]);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button 
        type="button"
        onClick={() => setOpen(!open)}
        className="pl-3 pr-8 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-full appearance-none cursor-pointer text-left truncate relative animate-fade-in"
      >
        {displayText}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </div>
      </button>
      
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[245px] bg-white border border-gray-200 rounded-xl shadow-xl max-h-72 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder={`Tìm kiếm trong ${title.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              onClick={(e) => e.stopPropagation()}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[10px] text-gray-400 hover:text-gray-600 px-1 font-semibold focus:outline-none cursor-pointer"
              >
                Xóa
              </button>
            )}
          </div>
          <div className="overflow-y-auto p-1 max-h-56 custom-scrollbar">
            {searchQuery.trim() === '' && (
              <label className="flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-gray-150 rounded-lg cursor-pointer text-gray-700">
                <input 
                  type="checkbox" 
                  checked={selected.length === 0}
                  onChange={() => { onChange([]); setOpen(false); }}
                  className="rounded border-gray-300 text-blue-500 focus:ring-blue-500/50"
                />
                <span className="font-medium">Tất cả</span>
              </label>
            )}
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-xs text-center text-gray-400">
                Không tìm thấy kết quả
              </div>
            ) : (
              filteredOptions.map((opt: any) => (
                <label key={opt.name} className="flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-gray-100 rounded-lg cursor-pointer text-gray-700 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={selected.includes(opt.name)}
                    onChange={() => toggleOption(opt.name)}
                    className="rounded border-gray-300 text-blue-500 focus:ring-blue-500/50"
                  />
                  <span className="truncate max-w-[170px]" title={opt.name}>{opt.name.length > 25 ? opt.name.substring(0,25) + '...' : opt.name}</span>
                  <span className="text-gray-400 font-mono text-[10px] ml-auto shrink-0">({opt.count})</span>
                </label>
              ))
            )}
          </div>
          {selected.length > 0 && (
            <div className="p-1 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[10px] text-rose-500 hover:text-rose-600 px-2.5 py-1 rounded hover:bg-rose-50 font-medium transition-colors cursor-pointer"
              >
                Bỏ chọn tất cả ({selected.length})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface Props {
  sheet: SheetData;
  filteredData: any[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const getErrorTags = (text: string, row?: any): string[] => {
  const tags: string[] = [];
  
  if (text && text !== 'N/A' && text !== 'Chưa phát hiện lỗi') {
    const lower = text.toLowerCase();
    if (lower.includes('los') || lower.includes('mất tín hiệu') || lower.includes('đèn đỏ')) tags.push('Mất tín hiệu (LOS)');
    if (lower.includes('suy hao không đạt chuẩn')) {
      tags.push('Suy hao không đạt chuẩn');
    } else if (lower.includes('suy hao') || lower.match(/rx\s*-\d+/) || lower.includes('quang yếu')) {
      tags.push('Suy hao quang');
    }
    if (lower.includes('nguồn') || lower.includes('power') || lower.includes('tắt')) tags.push('Lỗi nguồn');
    if (lower.includes('nhiệt độ') || lower.includes('temperature') || lower.includes('quá nhiệt')) tags.push('Quá nhiệt');
    if (lower.includes('treo') || lower.includes('reboot') || lower.includes('khởi động')) tags.push('Treo / Reboot');
    if (lower.includes('rssi') || lower.includes('wifi yếu') || lower.includes('wifi kém')) tags.push('Wifi yếu (RSSI)');
    if (lower.includes('band steering')) tags.push('Tắt Band Steering');
    if (lower.includes('single band')) tags.push('Single Band');
    if (lower.includes('lan 100') || lower.includes('nhận 100') || lower.includes('dây lan') || lower.includes('lan')) tags.push('Lỗi dây LAN / Cổng 100M');
    if (lower.includes('mesh')) tags.push('Lỗi Mesh');
    if (lower.includes('cáp') || lower.includes('đứt')) tags.push('Đứt / Lỗi Cáp');
    if (lower.includes('xong') || lower.includes('hoàn thành') || lower.includes('done')) tags.push('Đã xử lý (Xong)');
    if (lower.includes('chưa') || lower.includes('đang')) tags.push('Đang hoặc Chưa xử lý');
  }

  // Check explicit indicator columns in the row with value 1, true, or similar true-like values
  if (row) {
    const isTrue = (val: any) => String(val).trim() === '1' || String(val).trim().toLowerCase() === 'true' || String(val).trim().toLowerCase() === 'yes';
    Object.keys(row).forEach(key => {
      const kLower = key.toLowerCase();
      if (isTrue(row[key])) {
        if (kLower.includes('weakrssi') || kLower.includes('wifi kém') || kLower.includes('wifi yếu') || kLower.includes('ổn định wifi')) {
          tags.push('Wifi yếu (RSSI)');
        }
        if (kLower.includes('lan') && kLower.includes('100')) {
          tags.push('Lỗi dây LAN / Cổng 100M');
        }
        if (kLower.includes('mất tín hiệu') || kLower.includes('los')) {
          tags.push('Mất tín hiệu (LOS)');
        }
        if (kLower.includes('suy hao không đạt chuẩn')) {
          tags.push('Suy hao không đạt chuẩn');
        } else if (kLower.includes('suy hao') || kLower.includes('quang yếu')) {
          tags.push('Suy hao quang');
        }
        if (kLower.includes('single band')) {
          tags.push('Single Band');
        }
      } else if (String(row[key]).trim() === '0') {
        // If an explicit indicator column says 0, maybe we should remove the tag if it was false-positively added by text parsing?
        // E.g. "Wifi kém- weakRssi" is 0 -> it is NOT weak wifi.
        if (kLower.includes('weakrssi') || kLower.includes('wifi kém') || kLower.includes('wifi yếu') || kLower.includes('ổn định wifi')) {
          const index = tags.indexOf('Wifi yếu (RSSI)');
          if (index > -1) tags.splice(index, 1);
        }
        if (kLower.includes('lan') && kLower.includes('100')) {
          const index = tags.indexOf('Lỗi dây LAN / Cổng 100M');
          if (index > -1) tags.splice(index, 1);
        }
      }
    });
  }

  // Deduplicate tags
  return Array.from(new Set(tags));
};

const ErrorDetail = ({ text, tags = [], color = 'rose' }: { text: string, tags?: string[], color?: 'rose' | 'amber' }) => {
  if (!text || text === 'N/A' || text === 'Chưa phát hiện lỗi') return <span className="text-gray-500 italic">Chưa phát hiện lỗi</span>;
  
  let cleanDesc = text.trim();
  if (cleanDesc.length > 200) cleanDesc = cleanDesc.substring(0, 200) + '...';

  const isRose = color === 'rose';

  return (
    <div className="flex flex-col gap-2 w-full max-w-[350px]" title={text}>
      <span className={`text-xs leading-relaxed font-sans ${isRose ? 'text-rose-800' : 'text-amber-800'}`}>{cleanDesc}</span>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map(t => (
            <span key={t} className={`px-2 py-0.5 border rounded text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap shadow-sm ${
              isRose 
                ? 'bg-rose-50 border-rose-200 text-rose-700' 
                : 'bg-amber-50 border-amber-200 text-amber-700'
            }`}>
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default function TelecomDashboard({ sheet, filteredData }: Props) {
  const [filterModem, setFilterModem] = useState<string[]>([]);
  const [filterDetect, setFilterDetect] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterCause, setFilterCause] = useState<string[]>([]);
  const [filterRegion, setFilterRegion] = useState<string[]>([]);
  const [filterTeam, setFilterTeam] = useState<string[]>([]);
  const [statusChartType, setStatusChartType] = useState<'list' | 'chart'>('list');

  const telecomData = useMemo(() => {
    if (!sheet || filteredData.length === 0) return null;

    const cols = sheet.columns;
    const regionCol = findColumnByKeywords(cols, COL_KEYWORDS.region);
    const causeCol = findColumnByKeywords(cols, COL_KEYWORDS.cause);
    const warningCol = findColumnByKeywords(cols, COL_KEYWORDS.warning);
    const accountCol = findColumnByKeywords(cols, COL_KEYWORDS.account);
    const modemCol = findColumnByKeywords(cols, COL_KEYWORDS.modem);
    const statusCol = findColumnByKeywords(cols, COL_KEYWORDS.status);
    const teamCol = findColumnByKeywords(cols, COL_KEYWORDS.team);
    
    // We try to find the "reason" or "warning" by combining
    const getReason = (row: any) => {
      let r = '';
      if (causeCol && row[causeCol]) r += String(row[causeCol]) + ' ';
      if (warningCol && row[warningCol]) r += String(row[warningCol]);
      return r.trim();
    };

    const causesCount: Record<string, number> = {};
    const categoryCount: Record<string, number> = {};
    const regionCount: Record<string, number> = {};
    const modemCount: Record<string, number> = {};
    const teamCount: Record<string, number> = {};
    const detectCount: Record<string, number> = {};
    const statusCount: Record<string, number> = {};

    const actionList: any[] = [];
    const uniqueDetectTags = new Set<string>();
    const uniqueStatusTags = new Set<string>();

    filteredData.forEach((row, idx) => {
      const pReason = getReason(row);
      const category = getIssueCategory(pReason);
      
      const region = regionCol && row[regionCol] ? String(row[regionCol]) : 'Unknown';
      const user = accountCol && row[accountCol] ? String(row[accountCol]) : `Cus-${idx}`;
      const modem = modemCol && row[modemCol] ? String(row[modemCol]) : 'Unknown';
      const team = teamCol && row[teamCol] ? String(row[teamCol]) : 'N/A';
      
      const rawDetectedError = warningCol && row[warningCol] ? String(row[warningCol]) : (causeCol && row[causeCol] ? String(row[causeCol]) : 'Chưa phát hiện lỗi');
      const rawStatusValue = statusCol && row[statusCol] ? String(row[statusCol]) : 'Chưa phát hiện lỗi';
      
      const detectedError = summarizeText(rawDetectedError);
      const statusValue = summarizeText(rawStatusValue);
      
      if (pReason) {
        causesCount[pReason] = (causesCount[pReason] || 0) + 1;
      }

      categoryCount[category] = (categoryCount[category] || 0) + 1;
      regionCount[region] = (regionCount[region] || 0) + 1;
      modemCount[modem] = (modemCount[modem] || 0) + 1;
      teamCount[team] = (teamCount[team] || 0) + 1;

      const detectTags = getErrorTags(rawDetectedError || detectedError, row);
      if (detectTags.length === 0) {
        detectCount['Chưa phát hiện lỗi'] = (detectCount['Chưa phát hiện lỗi'] || 0) + 1;
      } else {
        detectTags.forEach(t => {
          uniqueDetectTags.add(t);
          detectCount[t] = (detectCount[t] || 0) + 1;
        });
      }

      const realStatus = rawStatusValue !== 'Chưa phát hiện lỗi' && rawStatusValue ? String(rawStatusValue).trim() : 'Chưa phát hiện lỗi';
      const statusTags = realStatus !== 'Chưa phát hiện lỗi' && realStatus !== '' ? [realStatus] : [];
      statusTags.forEach(t => {
        uniqueStatusTags.add(t);
      });
      
      if (realStatus !== 'Chưa phát hiện lỗi' && realStatus !== '') {
        statusCount[realStatus] = (statusCount[realStatus] || 0) + 1;
      } else {
        statusCount['Chưa phát hiện lỗi'] = (statusCount['Chưa phát hiện lỗi'] || 0) + 1;
      }

      // add all items to action list
      actionList.push({
        user,
        region,
        modem,
        team,
        cause: pReason || 'Chưa phát hiện lỗi',
        detectedError,
        rawDetectedError,
        status: statusValue,
        rawStatus: rawStatusValue,
        detectTags,
        statusTags
      });
    });

    const paretoCauses = Object.entries(causesCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ originalName: name, name: name.length > 50 ? name.substring(0, 50) + '...' : name, count }));

    const categoryData = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
      
    const regionData = Object.entries(regionCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ originalName: name, name: name.length > 20 ? name.substring(0, 20) : name, count }));

    const teamData = Object.entries(teamCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ originalName: name, name: name.length > 20 ? name.substring(0, 20) + '...' : name, count }));

    const modemData = Object.entries(modemCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ originalName: name, name: name.length > 20 ? name.substring(0, 20) : name, count }));

    const paretoDetects = Object.entries(detectCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ originalName: name, name: name.length > 50 ? name.substring(0, 50) + '...' : name, count }));

    const paretoStatus = Object.entries(statusCount)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ originalName: name, name: name.length > 50 ? name.substring(0, 50) + '...' : name, count }));

    return {
      total: filteredData.length,
      paretoCauses,
      paretoDetects,
      paretoStatus,
      categoryData,
      regionData,
      teamData,
      modemData,
      actionList,
      availableModems: Object.entries(modemCount).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
      availableCauses: Object.entries(causesCount).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
      availableDetectTags: Array.from(uniqueDetectTags).sort().concat(detectCount['Chưa phát hiện lỗi'] ? ['Chưa phát hiện lỗi'] : []).map(name => ({name, count: detectCount[name] || 0})),
      availableStatusTags: Array.from(uniqueStatusTags).sort().concat(statusCount['Chưa phát hiện lỗi'] ? ['Chưa phát hiện lỗi'] : []).map(name => ({name, count: statusCount[name] || 0}))
    };

  }, [sheet, filteredData]);

  if (!telecomData) return <div className="p-8 text-center text-gray-500">Đang phân tích dữ liệu...</div>;

  const filterPredicates: Record<string, (a: any) => boolean> = useMemo(() => ({
    status: (a: any) => {
      if (filterStatus.length === 0) return true;
      const s = (a.statusTags.length > 0 && a.statusTags[0] !== 'Chưa phát hiện lỗi') ? a.statusTags[0] : 'Chưa phát hiện lỗi';
      return filterStatus.includes(s);
    },
    cause: (a: any) => {
      if (filterCause.length === 0) return true;
      return filterCause.includes(a.cause);
    },
    detect: (a: any) => {
      if (filterDetect.length === 0) return true;
      if (filterDetect.includes('Chưa phát hiện lỗi') && a.detectTags.length === 0) return true;
      return a.detectTags.some((t: string) => filterDetect.includes(t));
    },
    modem: (a: any) => {
      if (filterModem.length === 0) return true;
      return filterModem.includes(a.modem);
    },
    region: (a: any) => {
      if (filterRegion.length === 0) return true;
      return filterRegion.includes(a.region);
    },
    team: (a: any) => {
      if (filterTeam.length === 0) return true;
      return filterTeam.includes(a.team);
    }
  }), [filterStatus, filterCause, filterDetect, filterModem, filterRegion, filterTeam]);

  const getFilteredDataWithout = (excludeKey: string) => {
    return telecomData.actionList.filter(a => {
      return Object.entries(filterPredicates).every(([key, predicate]) => {
        if (key === excludeKey) return true;
        return predicate(a);
      });
    });
  };

  const displayedActions = useMemo(() => {
    return telecomData.actionList.filter(a => Object.values(filterPredicates).every(p => p(a)));
  }, [telecomData, filterPredicates]);

  // Helper to re-calculate counts based on cascading filtered data
  const dynStatusOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    const filteredData = getFilteredDataWithout('status');
    filteredData.forEach(a => {
      const s = (a.statusTags.length > 0 && a.statusTags[0] !== 'Chưa phát hiện lỗi') ? a.statusTags[0] : 'Chưa phát hiện lỗi';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({name, count})).sort((a,b) => a.name.localeCompare(b.name));
  }, [telecomData, filterPredicates]);

  const dynCauseOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    const filteredData = getFilteredDataWithout('cause');
    filteredData.forEach(a => {
      counts[a.cause] = (counts[a.cause] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({name, count})).sort((a,b) => a.name.localeCompare(b.name));
  }, [telecomData, filterPredicates]);

  const dynDetectOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    const filteredData = getFilteredDataWithout('detect');
    filteredData.forEach(a => {
      if (a.detectTags.length === 0) {
        counts['Chưa phát hiện lỗi'] = (counts['Chưa phát hiện lỗi'] || 0) + 1;
      } else {
        a.detectTags.forEach((t: string) => {
          counts[t] = (counts[t] || 0) + 1;
        });
      }
    });
    return Object.entries(counts).map(([name, count]) => ({name, count})).sort((a,b) => a.name.localeCompare(b.name));
  }, [telecomData, filterPredicates]);

  const dynModemOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    const filteredData = getFilteredDataWithout('modem');
    filteredData.forEach(a => {
      counts[a.modem] = (counts[a.modem] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({name, count})).sort((a,b) => a.name.localeCompare(b.name));
  }, [telecomData, filterPredicates]);

  const dynRegionOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    const filteredData = getFilteredDataWithout('region');
    filteredData.forEach(a => {
      counts[a.region] = (counts[a.region] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({name, count})).sort((a,b) => a.name.localeCompare(b.name));
  }, [telecomData, filterPredicates]);

  const dynTeamOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    const filteredData = getFilteredDataWithout('team');
    filteredData.forEach(a => {
      counts[a.team] = (counts[a.team] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({name, count})).sort((a,b) => a.name.localeCompare(b.name));
  }, [telecomData, filterPredicates]);

  const topModem = telecomData.modemData[0]?.name || 'N/A';
  const topRegion = telecomData.regionData[0]?.name || 'N/A';
  const topCause = telecomData.paretoCauses[0]?.name || 'N/A';

  const handleDownloadCSV = () => {
    if (displayedActions.length === 0) return;

    const headers = ['Account / Thuê bao', 'Vùng / Region', 'KTV / Team', 'Thiết bị / Modem', 'Lỗi Detect', 'Tình trạng'];
    const csvContent = [
      headers.join(','),
      ...displayedActions.map(a => 
        [
          `"${a.user || ''}"`,
          `"${a.region || ''}"`,
          `"${a.team || ''}"`,
          `"${a.modem || ''}"`,
          `"${(a.rawDetectedError || a.detectedError || '').replace(/"/g, '""')}"`,
          `"${(a.rawStatus || a.status || '').replace(/"/g, '""')}"`
        ].join(',')
      )
    ].join('\n');

    // Add BOM for UTF-8 Excel support
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `danh_sach_loi_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-50 rounded-full blur-xl group-hover:bg-blue-100 transition-all"></div>
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <div className="p-2 bg-blue-50 border border-blue-100 rounded-xl text-blue-600">
              <Activity size={18} />
            </div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tổng Thiết bị / Thuê bao</h3>
          </div>
          <div className="text-3xl font-bold text-gray-900 font-mono mt-1 relative z-10">{telecomData.total.toLocaleString()}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-amber-50 rounded-full blur-xl group-hover:bg-amber-100 transition-all"></div>
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <div className="p-2 bg-amber-50 border border-amber-100 rounded-xl text-amber-600">
              <ServerCrash size={18} />
            </div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Dòng Modem Nhiều Nhất</h3>
          </div>
          <div className="text-lg font-bold text-gray-900 mt-2 relative z-10 truncate" title={topModem}>{topModem}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-50 rounded-full blur-xl group-hover:bg-emerald-100 transition-all"></div>
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600">
              <Users size={18} />
            </div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Khu Vực Phát Sinh Nhiều</h3>
          </div>
          <div className="text-lg font-bold text-gray-900 mt-2 relative z-10 truncate" title={topRegion}>{topRegion}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-rose-50 rounded-full blur-xl group-hover:bg-rose-100 transition-all"></div>
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <div className="p-2 bg-rose-50 border border-rose-100 rounded-xl text-rose-600">
              <AlertCircle size={18} />
            </div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Lỗi Phổ Biến Nhất</h3>
          </div>
          <div className="text-lg font-bold text-gray-900 mt-2 relative z-10 truncate" title={topCause}>{topCause}</div>
        </div>
      </div>

      {/* Row 1 Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pareto Causes */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-6 flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-500" /> Nhóm nguyên nhân thường gặp
          </h3>
          <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={telecomData.paretoCauses} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={250} />
                <RechartsTooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px', color: '#111827' }} />
                <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} maxBarSize={40} onClick={data => { setFilterCause([data.originalName || data.name]); setFilterDetect([]); setFilterModem([]); }} className="cursor-pointer" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pareto Detects */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-6 flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-500" /> Nhóm lỗi detect thường gặp
          </h3>
          <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={telecomData.paretoDetects} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={250} />
                <RechartsTooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px', color: '#111827' }} />
                <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} maxBarSize={40} onClick={data => { setFilterDetect([data.originalName || data.name]); setFilterModem([]); }} className="cursor-pointer" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2 Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Initial Detect Error / Status */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-amber-500" />
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">Tình trạng lỗi ban đầu</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">Nhấn để lọc nhanh danh sách</p>
                </div>
              </div>
              <div className="flex items-center bg-gray-100 p-0.5 rounded-lg self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => setStatusChartType('list')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    statusChartType === 'list'
                      ? 'bg-white text-amber-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Dạng danh sách %
                </button>
                <button
                  type="button"
                  onClick={() => setStatusChartType('chart')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    statusChartType === 'chart'
                      ? 'bg-white text-amber-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Biểu đồ cột ngang
                </button>
              </div>
            </div>

            {statusChartType === 'list' ? (
              <div className="space-y-3.5 max-h-[290px] overflow-y-auto pr-1 custom-scrollbar">
                {telecomData.paretoStatus.map((item, index) => {
                  const maxVal = Math.max(...telecomData.paretoStatus.map(s => s.count)) || 1;
                  const percentage = Math.round((item.count / telecomData.total) * 100);
                  const barWidth = `${(item.count / maxVal) * 100}%`;
                  const isSelected = filterStatus.includes(item.originalName || item.name);

                  return (
                    <div
                      key={index}
                      onClick={() => {
                        const name = item.originalName || item.name;
                        if (filterStatus.includes(name)) {
                          setFilterStatus([]);
                        } else {
                          setFilterStatus([name]);
                          setFilterCause([]);
                          setFilterDetect([]);
                          setFilterModem([]);
                          setFilterRegion([]);
                          setFilterTeam([]);
                        }
                      }}
                      className={`group cursor-pointer p-3 rounded-xl transition-all border ${
                        isSelected
                          ? 'bg-amber-50/80 border-amber-300 shadow-sm'
                          : 'bg-gray-50/50 border-gray-100/70 hover:bg-gray-100/80 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <span className={`text-xs font-semibold leading-relaxed break-words flex-1 ${isSelected ? 'text-amber-900 font-bold' : 'text-gray-700 group-hover:text-amber-800'}`}>
                          {item.originalName || item.name}
                        </span>
                        <span className="text-xs font-mono font-bold text-gray-900 flex items-center gap-1.5 shrink-0">
                          {item.count.toLocaleString()} <span className="text-gray-400 font-normal">({percentage}%)</span>
                        </span>
                      </div>

                      <div className="w-full bg-gray-200/60 rounded-full h-2.5 overflow-hidden shadow-inner">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isSelected ? 'bg-amber-500' : 'bg-amber-400 group-hover:bg-amber-500'
                          }`}
                          style={{ width: barWidth }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-[290px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={telecomData.paretoStatus} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={({ x, y, payload }) => {
                        const displayName = payload.value.length > 35 ? payload.value.substring(0, 35) + '...' : payload.value;
                        const isSel = filterStatus.includes(payload.value);
                        return (
                          <g transform={`translate(${x},${y})`}>
                            <text
                              x={-10}
                              y={4}
                              dy={0}
                              textAnchor="end"
                              fill={isSel ? "#b45309" : "#4b5563"}
                              fontSize={10}
                              fontWeight={isSel ? "bold" : "normal"}
                              className="font-sans"
                            >
                              {displayName}
                            </text>
                          </g>
                        );
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={180}
                    />
                    <RechartsTooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px', color: '#111827' }} />
                    <Bar
                      dataKey="count"
                      fill="#f59e0b"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={40}
                      onClick={data => {
                        const name = data.originalName || data.name;
                        if (filterStatus.includes(name)) {
                          setFilterStatus([]);
                        } else {
                          setFilterStatus([name]);
                          setFilterCause([]);
                          setFilterDetect([]);
                          setFilterModem([]);
                          setFilterRegion([]);
                          setFilterTeam([]);
                        }
                      }}
                      className="cursor-pointer"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Modem Chart */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-6 flex items-center gap-2">
            <ServerCrash size={16} className="text-blue-500" /> Phân loại theo Modem (Thiết bị)
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={telecomData.modemData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px', color: '#111827' }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} onClick={data => setFilterModem([data.originalName || data.name])} className="cursor-pointer" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3 Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Region Chart */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-6 flex items-center gap-2">
            <Users size={16} className="text-emerald-500" /> Tần suất theo Khu Vực / Block
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={telecomData.regionData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px', color: '#111827' }} />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} onClick={data => setFilterRegion([data.originalName || data.name])} className="cursor-pointer" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Team Chart */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-6 flex items-center gap-2">
            <Users size={16} className="text-indigo-500" /> Tần suất theo KTV (Nhân sự / Team)
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={telecomData.teamData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={250} />
                <RechartsTooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px', color: '#111827' }} />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} maxBarSize={40} onClick={data => setFilterTeam([data.originalName || data.name])} className="cursor-pointer" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Action List */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <ArrowRight size={16} className="text-blue-500" /> Danh sách thiết bị / thuê bao lỗi ({displayedActions.length} kết quả)
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <MultiSelect
              title="Tất cả tình trạng"
              options={dynStatusOptions}
              selected={filterStatus}
              onChange={setFilterStatus}
              className="w-full sm:w-48"
            />
            <MultiSelect
              title="Tất cả nguyên nhân"
              options={dynCauseOptions}
              selected={filterCause}
              onChange={setFilterCause}
              className="w-full md:w-60"
            />
            <MultiSelect
              title="Tất cả lỗi (Detect)"
              options={dynDetectOptions}
              selected={filterDetect}
              onChange={setFilterDetect}
              className="w-full sm:w-48"
            />
            <MultiSelect
              title="Tất cả Modem"
              options={dynModemOptions}
              selected={filterModem}
              onChange={setFilterModem}
              className="w-full sm:w-48"
            />
            <MultiSelect
              title="Tất cả Khu vực"
              options={dynRegionOptions}
              selected={filterRegion}
              onChange={setFilterRegion}
              className="w-full sm:w-48"
            />
            <MultiSelect
              title="Tất cả NV Kỹ thuật"
              options={dynTeamOptions}
              selected={filterTeam}
              onChange={setFilterTeam}
              className="w-full sm:w-48"
            />
            
            <button
              onClick={handleDownloadCSV}
              disabled={displayedActions.length === 0}
              className="px-3 py-1.5 flex items-center gap-1.5 text-sm bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors ml-auto md:ml-0"
              title="Xuất CSV danh sách hiện tại"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Xuất CSV</span>
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider">
                <th className="pb-3 px-4 font-medium">Số hợp đồng</th>
                <th className="pb-3 px-4 font-medium">Khu vực (Block)</th>
                <th className="pb-3 px-4 font-medium">KTV (Nhân sự)</th>
                <th className="pb-3 px-4 font-medium">Modem</th>
                <th className="pb-3 px-4 font-medium">Lỗi Detect</th>
                <th className="pb-3 px-4 font-medium">Tình trạng lỗi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayedActions.map((action, i) => (
                <tr key={i} className="group hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-gray-900 font-mono text-xs align-top whitespace-nowrap">{action.user}</td>
                  <td className="py-3 px-4 text-gray-600 text-xs align-top">{action.region}</td>
                  <td className="py-3 px-4 text-gray-600 text-xs align-top whitespace-nowrap">{action.team}</td>
                  <td className="py-3 px-4 text-blue-600 font-mono text-xs align-top min-w-[120px]">{action.modem}</td>
                  <td className="py-3 px-4 align-top">
                    <ErrorDetail text={action.detectedError} tags={action.detectTags} color="rose" />
                  </td>
                  <td className="py-3 px-4 align-top">
                    <ErrorDetail text={action.status} tags={action.statusTags} color="amber" />
                  </td>
                </tr>
              ))}
              {displayedActions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500 italic">Không tìm thấy dữ liệu.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
