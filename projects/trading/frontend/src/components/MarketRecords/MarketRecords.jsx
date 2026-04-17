import { useState, useEffect, useRef } from 'react'
import { Table, Plus, Trash2, RefreshCw, StickyNote, X } from 'lucide-react'

const API = '/api'
const TREND_COLUMNS = [
  { key: 'up', name: '上升趋势' },
  { key: 'up_natural', name: '自然回撤' },
  { key: 'up_rally', name: '回升' },
  { key: 'up_secondary', name: '次级回撤' },
  { key: 'up_break', name: '上升破坏' },
  { key: 'down', name: '下跌趋势' },
  { key: 'down_natural', name: '自然回升' },
  { key: 'down_rally', name: '回撤' },
  { key: 'down_secondary', name: '次级回升' },
  { key: 'down_break', name: '下跌破坏' },
]

export default function MarketRecords({ stockId, stockName, onBack }) {
  const [records, setRecords] = useState([])
  const [stocks, setStocks] = useState([])
  const [selectedStockId, setSelectedStockId] = useState(null)
  const [selectedGroupId, setSelectedGroupId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [editingCell, setEditingCell] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [showNoteModal, setShowNoteModal] = useState(null)
  const loadingRef = useRef(false)
  const addLoadingRef = useRef(false)

  useEffect(() => {
    loadStocks()
  }, [])

  useEffect(() => {
    if (stockId) {
      setSelectedStockId(stockId)
    }
  }, [stockId])

  useEffect(() => {
    if (selectedStockId) {
      loadRecords(selectedStockId)
    } else {
      setRecords([])
    }
  }, [selectedStockId])

  const loadStocks = async () => {
    try {
      const res = await fetch(`${API}/stocks`)
      const data = await res.json()
      setStocks(data)
      if (!selectedStockId && data.length > 0) {
        setSelectedStockId(data[0].id)
      }
    } catch (err) {
      console.error('Failed to fetch stocks:', err)
    }
  }

  const loadRecords = async (stockId) => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    try {
      const res = await fetch(`${API}/market-records?stock_id=${stockId}`)
      const data = await res.json()
      setRecords(data)
    } catch (err) {
      console.error('Failed to fetch records:', err)
    }
    setLoading(false)
    loadingRef.current = false
  }

  const addRecord = async () => {
    if (!selectedStockId || addLoadingRef.current) return
    addLoadingRef.current = true
    
    const today = new Date().toISOString().split('T')[0]
    const newRecord = {
      id: Date.now(), // temporary id
      stock_id: selectedStockId,
      date: today,
      data: {},
      created_at: new Date().toISOString()
    }
    
    // Immediately add to local state for fast feedback
    setRecords(prev => [newRecord, ...prev])
    
    try {
      const res = await fetch(`${API}/market-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stock_id: selectedStockId,
          date: today,
          data: {}
        })
      })
      const savedRecord = await res.json()
      // Replace temp record with real one
      setRecords(prev => prev.map(r => r.id === newRecord.id ? savedRecord : r))
    } catch (err) {
      console.error('Failed to add record:', err)
      // Remove temp record on error
      setRecords(prev => prev.filter(r => r.id !== newRecord.id))
    }
    addLoadingRef.current = false
  }

  const deleteRecord = async (id) => {
    // Optimistic delete
    setRecords(prev => prev.filter(r => r.id !== id))
    try {
      await fetch(`${API}/market-records/${id}`, { method: 'DELETE' })
    } catch (err) {
      console.error('Failed to delete record:', err)
    }
  }

  const updateCell = async (recordId, trend, value) => {
    const record = records.find(r => r.id === recordId)
    if (!record) return

    const newData = { ...record.data, [trend]: { ...record.data?.[trend], value } }

    try {
      await fetch(`${API}/market-records/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stock_id: selectedStockId,
          data: newData
        })
      })
      setRecords(prev => prev.map(r => r.id === recordId ? { ...r, data: newData } : r))
    } catch (err) {
      console.error('Failed to update cell:', err)
    }
    setEditingCell(null)
  }

  const updateNote = async (recordId, trend, note, color) => {
    const record = records.find(r => r.id === recordId)
    if (!record) return

    const trendData = record.data?.[trend] || {}
    const newData = { ...record.data, [trend]: { ...trendData, note, color } }

    try {
      await fetch(`${API}/market-records/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stock_id: selectedStockId,
          data: newData
        })
      })
      setRecords(prev => prev.map(r => r.id === recordId ? { ...r, data: newData } : r))
      setShowNoteModal(null)
    } catch (err) {
      console.error('Failed to update note:', err)
    }
  }

  const getPreviousFilledValue = (currentRecordIndex) => {
    for (let i = currentRecordIndex + 1; i < records.length; i++) {
      const record = records[i]
      for (const trend of TREND_COLUMNS) {
        const val = record.data?.[trend.key]?.value
        if (val) return val
      }
    }
    return null
  }

  const getCurrentFilledValue = (record) => {
    for (const trend of TREND_COLUMNS) {
      const val = record.data?.[trend.key]?.value
      if (val) return val
    }
    return null
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', weekday: 'short' })
  }

  const stocksByGroup = {}
  stocks.forEach(stock => {
    const groupId = stock.logic_group_id || 'ungrouped'
    const groupName = stock.logic_group?.name || '未分组'
    const groupColor = stock.logic_group?.color || '#6b7280'
    if (!stocksByGroup[groupId]) {
      stocksByGroup[groupId] = { name: groupName, color: groupColor, stocks: [] }
    }
    stocksByGroup[groupId].stocks.push(stock)
  })

  const selectedStock = stocks.find(s => s.id === selectedStockId)

  const handleStockSelect = (stockId) => {
    setSelectedStockId(stockId)
  }

  const handleGroupSelect = (groupId) => {
    setSelectedGroupId(groupId)
    if (groupId === null) {
      if (stocks.length > 0) setSelectedStockId(stocks[0].id)
    } else {
      const groupData = stocksByGroup[groupId]
      if (groupData?.stocks.length > 0) setSelectedStockId(groupData.stocks[0].id)
    }
  }

  return (
    <div className="max-w-full mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 bg-slate-700 rounded-lg text-slate-400 hover:text-white">
              <X size={18} />
            </button>
          )}
          <Table className="text-indigo-400" size={28} />
          <h2 className="text-2xl font-bold text-white">行情记录</h2>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => loadRecords(selectedStockId)} className="p-2 bg-slate-700 rounded-lg text-slate-400 hover:text-white" title="刷新">
            <RefreshCw size={18} />
          </button>
          <button 
            onClick={addRecord} 
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
            disabled={!selectedStockId}
          >
            <Plus size={18} />
            新增行
          </button>
        </div>
      </div>

      {/* Stock Selector */}
      <div className="mb-4 bg-slate-800 rounded-lg border border-slate-700 p-3">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="text-slate-400 text-sm mr-2">分组：</span>
          <button
            onClick={() => handleGroupSelect(null)}
            className={`px-3 py-1.5 rounded text-sm ${!selectedGroupId ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          >
            全部
          </button>
          {Object.entries(stocksByGroup).map(([groupId, group]) => {
            const isSelected = selectedGroupId === (groupId === 'ungrouped' ? null : parseInt(groupId))
            return (
              <button
                key={groupId}
                onClick={() => handleGroupSelect(groupId === 'ungrouped' ? null : parseInt(groupId))}
                className={`px-3 py-1.5 rounded text-sm flex items-center gap-2 ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />
                <span>{group.name}</span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 text-sm mr-2">股票：</span>
          {(selectedGroupId === null ? stocks : stocksByGroup[selectedGroupId]?.stocks || []).map(stock => (
            <button
              key={stock.id}
              onClick={() => handleStockSelect(stock.id)}
              className={`px-3 py-1.5 rounded text-sm ${
                selectedStockId === stock.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {stock.name}
            </button>
          ))}
        </div>
      </div>

      {/* Current Stock */}
      {selectedStock && (
        <div className="mb-3 flex items-center gap-3">
          <span className="text-slate-400">当前：</span>
          <span className="px-3 py-1 bg-indigo-600/30 text-indigo-300 rounded-lg font-medium">
            {selectedStock.name}
          </span>
          {selectedStock.logic_group && (
            <span
              className="px-2 py-0.5 rounded text-xs"
              style={{ backgroundColor: selectedStock.logic_group.color + '30', color: selectedStock.logic_group.color }}
            >
              {selectedStock.logic_group.name}
            </span>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto bg-slate-800 rounded-lg border border-slate-700">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="animate-spin text-indigo-400" size={24} />
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-750">
                <th className="p-3 text-left text-base font-medium text-slate-300 border border-slate-700 sticky left-0 bg-slate-750 z-10 min-w-[100px]">日期</th>
                <th className="p-3 text-center text-base font-medium text-slate-300 border border-slate-700 min-w-[80px]">涨跌%</th>
                {TREND_COLUMNS.map(col => (
                  <th key={col.key} className="p-3 text-center text-base font-medium text-slate-300 border border-slate-700 min-w-[90px]">
                    {col.name}
                  </th>
                ))}
                <th className="p-3 text-center text-base font-medium text-slate-300 border border-slate-700 w-14">删</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-slate-500 text-base">
                    {selectedStockId ? '暂无记录，点击"新增行"开始' : '请先选择股票'}
                  </td>
                </tr>
              ) : (
                records.map((record, recordIndex) => {
                  const currentValue = getCurrentFilledValue(record)
                  const prevValue = getPreviousFilledValue(recordIndex)
                  const percentChange = currentValue && prevValue
                    ? ((currentValue - prevValue) / prevValue * 100).toFixed(1)
                    : null

                  return (
                    <tr key={record.id} className="hover:bg-slate-700/50">
                      <td className="p-3 border border-slate-700 sticky left-0 bg-slate-800 z-10">
                        <span className="text-white text-base font-medium">{formatDate(record.date)}</span>
                      </td>
                      <td className="p-3 border border-slate-700 text-center">
                        {percentChange !== null ? (
                          <span className={`text-base font-medium ${parseFloat(percentChange) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {parseFloat(percentChange) >= 0 ? '↑' : '↓'} {Math.abs(percentChange)}%
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      {TREND_COLUMNS.map(col => {
                        const cellData = record.data?.[col.key] || {}
                        const cellValue = cellData.value
                        const cellColor = cellData.color

                        return (
                          <td
                            key={col.key}
                            className="p-1 border border-slate-700 relative"
                            style={{ backgroundColor: cellColor ? `${cellColor}25` : 'transparent' }}
                          >
                            {editingCell?.recordId === record.id && editingCell?.trend === col.key ? (
                              <input
                                type="number"
                                step="0.01"
                                className="w-full bg-slate-600 text-white rounded px-1 py-2 text-center text-base focus:outline-none"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => updateCell(record.id, col.key, parseFloat(editValue) || null)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') updateCell(record.id, col.key, parseFloat(editValue) || null)
                                  if (e.key === 'Escape') setEditingCell(null)
                                }}
                                autoFocus
                              />
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <span
                                  className="py-2 cursor-pointer hover:bg-slate-600/50 rounded w-full text-center text-white text-base"
                                  onClick={() => {
                                    setEditingCell({ recordId: record.id, trend: col.key })
                                    setEditValue(cellValue ?? '')
                                  }}
                                >
                                  {cellValue ?? '-'}
                                </span>
                                {cellData.note && (
                                  <button
                                    className="p-1 text-yellow-400 hover:text-yellow-300"
                                    onClick={() => setShowNoteModal({ recordId: record.id, trend: col.key })}
                                  >
                                    <StickyNote size={14} />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        )
                      })}
                      <td className="p-2 border border-slate-700 text-center">
                        <button
                          onClick={() => deleteRecord(record.id)}
                          className="p-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded transition-colors"
                          title="删除"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Note Modal */}
      {showNoteModal && (() => {
        const record = records.find(r => r.id === showNoteModal.recordId)
        const cellData = record?.data?.[showNoteModal.trend] || {}
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNoteModal(null)}>
            <div className="bg-slate-800 rounded-lg p-5 w-80 border border-slate-700" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-white mb-3">
                笔记 - {TREND_COLUMNS.find(c => c.key === showNoteModal.trend)?.name}
              </h3>
              <textarea
                id="noteText"
                className="w-full bg-slate-700 text-white rounded px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                rows={3}
                placeholder="输入笔记..."
                defaultValue={cellData.note || ''}
              />
              <div className="mt-3">
                <label className="block text-sm text-slate-400 mb-1">颜色</label>
                <div className="flex gap-2">
                  {['', '#22c55e', '#ef4444', '#3b82f6', '#eab308', '#8b5cf6', '#f97316', '#ec4899'].map(c => (
                    <button
                      key={c || 'none'}
                      className={`w-7 h-7 rounded ${!c ? 'border-2 border-slate-500' : ''}`}
                      style={c ? { backgroundColor: c } : {}}
                      onClick={() => {
                        const note = document.getElementById('noteText').value
                        updateNote(showNoteModal.recordId, showNoteModal.trend, note, c || null)
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setShowNoteModal(null)} className="px-4 py-2 text-slate-400 hover:text-white">
                  取消
                </button>
                <button
                  onClick={() => {
                    const note = document.getElementById('noteText').value
                    updateNote(showNoteModal.recordId, showNoteModal.trend, note, cellData.color || null)
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
