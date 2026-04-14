import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { X, Plus, Minus } from 'lucide-react';
import { generateTable } from '../../utils/markdownUtils';

interface TableEditorProps {
  onInsert: (markdown: string) => void;
  onClose: () => void;
}

export function TableEditor({ onInsert, onClose }: TableEditorProps) {
  const theme = useAppStore(s => s.settings.theme);
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [headers, setHeaders] = useState<string[]>(['', '', '']);
  const [cells, setCells] = useState<string[][]>(
    Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => ''))
  );

  const updateHeader = (index: number, value: string) => {
    const next = [...headers];
    next[index] = value;
    setHeaders(next);
  };

  const updateCell = (row: number, col: number, value: string) => {
    const next = cells.map(r => [...r]);
    next[row][col] = value;
    setCells(next);
  };

  const addRow = () => {
    setRows(rows + 1);
    setCells([...cells, Array.from({ length: cols }, () => '')]);
  };

  const removeRow = () => {
    if (rows <= 1) return;
    setRows(rows - 1);
    setCells(cells.slice(0, -1));
  };

  const addCol = () => {
    setCols(cols + 1);
    setHeaders([...headers, '']);
    setCells(cells.map(r => [...r, '']));
  };

  const removeCol = () => {
    if (cols <= 1) return;
    setCols(cols - 1);
    setHeaders(headers.slice(0, -1));
    setCells(cells.map(r => r.slice(0, -1)));
  };

  const handleInsert = () => {
    const hasCustomHeaders = headers.some(h => h.trim() !== '');
    const hasCells = cells.some(r => r.some(c => c.trim() !== ''));

    if (hasCustomHeaders || hasCells) {
      const headerRow = `| ${headers.map(h => h || '   ').join(' | ')} |`;
      const separator = `| ${Array.from({ length: cols }, () => '---').join(' | ')} |`;
      const dataRows = cells.map(row =>
        `| ${row.map(c => c || '   ').join(' | ')} |`
      ).join('\n');
      onInsert(`${headerRow}\n${separator}\n${dataRows}`);
    } else {
      onInsert(generateTable(rows, cols));
    }
    onClose();
  };

  const bg = theme === 'dark' ? 'bg-zinc-800' : 'bg-white';
  const border = theme === 'dark' ? 'border-zinc-600' : 'border-zinc-300';
  const inputBg = theme === 'dark' ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-100 text-zinc-800';
  const btnBg = theme === 'dark' ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-zinc-200 hover:bg-zinc-300';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className={`${bg} border ${border} rounded-lg shadow-xl p-4 max-w-lg w-full mx-4`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Insert Table</h3>
          <button onClick={onClose} className={`p-1 rounded ${btnBg}`}>
            <X size={14} />
          </button>
        </div>

        {/* Size controls */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2 text-xs">
            <span>Rows:</span>
            <button onClick={removeRow} className={`p-1 rounded ${btnBg}`}><Minus size={12} /></button>
            <span className="w-6 text-center">{rows}</span>
            <button onClick={addRow} className={`p-1 rounded ${btnBg}`}><Plus size={12} /></button>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span>Cols:</span>
            <button onClick={removeCol} className={`p-1 rounded ${btnBg}`}><Minus size={12} /></button>
            <span className="w-6 text-center">{cols}</span>
            <button onClick={addCol} className={`p-1 rounded ${btnBg}`}><Plus size={12} /></button>
          </div>
        </div>

        {/* Table grid */}
        <div className="overflow-auto max-h-64 mb-4">
          <table className="w-full text-xs">
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className={`p-1 border ${border}`}>
                    <input
                      value={h}
                      onChange={e => updateHeader(i, e.target.value)}
                      placeholder={`Header ${i + 1}`}
                      className={`w-full px-1 py-0.5 rounded ${inputBg} text-xs outline-none`}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cells.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} className={`p-1 border ${border}`}>
                      <input
                        value={cell}
                        onChange={e => updateCell(ri, ci, e.target.value)}
                        className={`w-full px-1 py-0.5 rounded ${inputBg} text-xs outline-none`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className={`px-3 py-1.5 text-xs rounded ${btnBg}`}>
            Cancel
          </button>
          <button
            onClick={handleInsert}
            className="px-3 py-1.5 text-xs rounded bg-blue-600 hover:bg-blue-700 text-white"
          >
            Insert
          </button>
        </div>
      </div>
    </div>
  );
}
