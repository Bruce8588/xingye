import { useState } from 'react'
import { Plus, X, Check, Database, Search } from 'lucide-react'

// Stock Picker Modal - shared across LogicGroups and Memo pages
export default function StockPickerModal({ stocks, groupId, onClose, onConfirm }) {
  const [selected, setSelected] = useState([])
  const [searchQuery, setSearchQuery] = useState('')

  // Only show stocks not already in this group
  const availableStocks = stocks.filter(s => s.logic_group_id !== groupId)

  // Filter by search query
  const displayedStocks = availableStocks.filter(s => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return s.name.toLowerCase().includes(q) || (s.code && s.code.toLowerCase().includes(q))
  })

  const toggleStock = (stockId) => {
    setSelected(prev =>
      prev.includes(stockId)
        ? prev.filter(id => id !== stockId)
        : [...prev, stockId]
    )
  }

  const handleConfirm = () => {
    onConfirm(selected)
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white">添加股票到分组</h3>
            <p className="text-sm text-slate-400 mt-1">选择要添加的股票（可多选）</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 border-b border-slate-700">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索股票名称或代码..."
              className="w-full bg-slate-700 text-white pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
              autoFocus
            />
          </div>
          {searchQuery && (
            <p className="text-xs text-slate-500 mt-2">找到 {displayedStocks.length} 只股票</p>
          )}
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {displayedStocks.length === 0 ? (
            <div className="text-center text-slate-500 py-8">
              <Database size={40} className="mx-auto mb-3 opacity-50" />
              <p>没有可添加的股票了</p>
              {searchQuery ? <p className="text-sm mt-1">没有匹配的股票，试试其他关键词</p> : <p className="text-sm mt-1">所有股票都已在该分组中</p>}
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {displayedStocks.map(stock => {
                const isSelected = selected.includes(stock.id)
                return (
                  <button
                    key={stock.id}
                    onClick={() => toggleStock(stock.id)}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border transition-all
                      ${isSelected
                        ? 'border-indigo-500 bg-indigo-500/20 text-white'
                        : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
                      }
                    `}
                  >
                    <div className={`
                      w-6 h-6 rounded border-2 flex items-center justify-center transition-colors
                      ${isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-slate-500'}
                    `}>
                      {isSelected && <Check size={14} className="text-white" />}
                    </div>
                    <span className="font-medium">{stock.name}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-700 flex justify-between items-center">
          <span className="text-slate-400">
            已选择 {selected.length} 只股票
          </span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={selected.length === 0}
              className={`
                flex items-center gap-2 px-6 py-2 rounded-lg transition-colors
                ${selected.length > 0
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                }
              `}
            >
              <Plus size={16} />
              添加 {selected.length > 0 ? `${selected.length} 只` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
