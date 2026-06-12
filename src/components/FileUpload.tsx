import React, { useCallback, useState } from 'react';
import { UploadCloud, FileSpreadsheet, PieChart, Table } from 'lucide-react';
import * as XLSX from 'xlsx';
import { SheetData, DataRow } from '../types';
import { findColumnByKeywords, COL_KEYWORDS } from '../utils/telecomMappings';

interface FileUploadProps {
  onDataLoaded: (sheets: SheetData[]) => void;
}

export default function FileUpload({ onDataLoaded }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const processFiles = async (files: File[] | FileList) => {
    setIsLoading(true);
    try {
      let allSheets: SheetData[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        
        const sheetsData: SheetData[] = workbook.SheetNames.map(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json<DataRow>(worksheet, { defval: null });
          
          let columns: string[] = [];
          if (json.length > 0) {
            columns = Object.keys(json[0]);
          }
          
          return {
            name: `${file.name} - ${sheetName}`,
            data: json,
            columns
          };
        }).filter(s => s.data.length > 0);
        
        allSheets = [...allSheets, ...sheetsData];
      }

      // Auto-join logic if multiple sheets are uploaded and they share the 'account' (hợp đồng) column
      if (allSheets.length > 1) {
        const sheetsWithAccountCol = allSheets.map(sheet => {
          const accountCol = findColumnByKeywords(sheet.columns, COL_KEYWORDS.account);
          let errorScore = (findColumnByKeywords(sheet.columns, COL_KEYWORDS.cause) ? 1 : 0) +
                             (findColumnByKeywords(sheet.columns, COL_KEYWORDS.warning) ? 1 : 0) +
                             (findColumnByKeywords(sheet.columns, COL_KEYWORDS.status) ? 1 : 0);
                             
          const nameLower = sheet.name.toLowerCase();
          if (nameLower.includes('lỗi') || nameLower.includes('loi') || nameLower.includes('chi tiết') || nameLower.includes('chitiet') || nameLower.includes('detail') || nameLower.includes('cảnh báo')) {
            errorScore += 10;
          }
          
          return { sheet, accountCol, errorScore };
        });

        const mergeable = sheetsWithAccountCol.filter(s => s.accountCol !== null);
        
        if (mergeable.length > 1) {
          // Determine the "base" sheet (file lỗi). The one with the highest errorScore, or if tie, the largest one
          mergeable.sort((a, b) => b.errorScore - a.errorScore || b.sheet.data.length - a.sheet.data.length);
          const baseItem = mergeable[0];
          const otherItems = mergeable.slice(1);

          const baseSheet = baseItem.sheet;
          const baseAccountCol = baseItem.accountCol as string;

          // Build a lookup map from the OTHER sheets
          const lookupMap = new Map<string, any>();
          let extraColumns = new Set<string>();

          for (const item of otherItems) {
            const actualCol = item.accountCol as string;
            item.sheet.columns.forEach(c => {
               if (c !== actualCol && c !== baseAccountCol && !baseSheet.columns.includes(c)) {
                 extraColumns.add(c);
               }
            });

            for (const row of item.sheet.data) {
              const accountVal = String(row[actualCol]).trim().toUpperCase();
              if (!accountVal) continue;
              
              const existingMatch = lookupMap.get(accountVal) || {};
              for (const [key, val] of Object.entries(row)) {
                if (key !== actualCol && val !== null && val !== '') {
                  existingMatch[key] = val;
                }
              }
              lookupMap.set(accountVal, existingMatch);
            }
          }

          // Left join: map base sheet rows and attach extra info from lookupMap
          const finalMergedData = baseSheet.data.map(baseRow => {
            const rawAccountVal = baseRow[baseAccountCol] ? String(baseRow[baseAccountCol]) : '';
            const accountVal = rawAccountVal.trim().toUpperCase();
            const extraInfo = accountVal ? lookupMap.get(accountVal) : null;
            return {
              ...baseRow,
              ...(extraInfo || {})
            };
          });

          // Create unique columns array
          const finalColumns = Array.from(new Set([...baseSheet.columns, ...Array.from(extraColumns)]));

          allSheets = [{
            name: `Dữ liệu gộp (Gốc: ${baseSheet.name})`,
            data: finalMergedData,
            columns: finalColumns
          }];
        }
      }

      onDataLoaded(allSheets);
    } catch (error) {
      console.error("Error parsing files:", error);
      alert("Failed to parse files. Please ensure it is a valid Excel or CSV file.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, []);

  const handleChange = function(e: React.ChangeEvent<HTMLInputElement>) {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight mb-4">Upload Dữ liệu</h1>
        <p className="text-gray-500 max-w-xl mx-auto text-lg">
          Tải lên nhiều file dữ liệu thô (vd: Lỗi & Thông tin KH) để hệ thống tự động gộp theo "Hợp đồng".
        </p>
      </div>

      <div 
        className={`w-full max-w-3xl p-16 border-2 border-dashed rounded-2xl transition-all duration-200 ease-in-out flex flex-col items-center justify-center relative shadow-sm ${
          isDragging ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-gray-300 bg-white hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className={`p-5 rounded-full mb-6 ${isLoading ? 'bg-gray-100' : 'bg-blue-50 text-blue-600'}`}>
          {isLoading ? (
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          ) : (
            <UploadCloud size={48} strokeWidth={1.5} />
          )}
        </div>
        <h3 className="text-2xl font-semibold text-gray-800 mb-3">
          {isLoading ? 'Đang xử lý file...' : 'Tải lên hoặc kéo thả nhiều file vào đây'}
        </h3>
        <p className="text-gray-500 text-center mb-8 max-w-sm">
          Hỗ trợ chọn cùng lúc nhiều file (.xlsx, .csv). Hệ thống sẽ tự động tìm cột "Hợp đồng" để ghép nối dữ liệu cho bạn.
        </p>
        
        <label className="cursor-pointer bg-blue-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm active:scale-95">
          Chọn File (Có thể chọn nhiều)
          <input 
            type="file" 
            className="hidden" 
            multiple
            accept=".xlsx, .xls, .csv" 
            onChange={handleChange}
            disabled={isLoading}
          />
        </label>
      </div>
      
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl text-center">
         <div className="bg-white p-8 rounded-2xl border border-gray-200 flex flex-col items-center shadow-sm">
            <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mb-4">
              <FileSpreadsheet className="text-green-500" size={24} />
            </div>
            <h4 className="font-semibold text-gray-800 text-lg">Ghép Nối Tự Động</h4>
            <p className="text-sm text-gray-500 mt-2">Dễ dàng gộp dữ liệu từ nhiều file Excel dựa trên cột Hợp Đồng.</p>
         </div>
         <div className="bg-white p-8 rounded-2xl border border-gray-200 flex flex-col items-center shadow-sm">
            <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mb-4">
              <PieChart className="text-purple-500" size={24} />
            </div>
            <h4 className="font-semibold text-gray-800 text-lg">Dashboard Động</h4>
            <p className="text-sm text-gray-500 mt-2">Phân tích đa chiều khi dữ liệu được kết hợp toàn diện.</p>
         </div>
         <div className="bg-white p-8 rounded-2xl border border-gray-200 flex flex-col items-center shadow-sm">
            <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mb-4">
              <Table className="text-orange-500" size={24} />
            </div>
            <h4 className="font-semibold text-gray-800 text-lg">Raw Data View</h4>
            <p className="text-sm text-gray-500 mt-2">Kiểm tra kết quả ghép nối dữ liệu trực tiếp dưới dạng bảng.</p>
         </div>
      </div>
    </div>
  );
}
