import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Save, X, ChevronRight, Database, GripVertical } from 'lucide-react'
import StockPickerModal from '../Stocks/StockPickerModal'

const API = '/api'

export default function MemoList({ onStockClick }) {
  const [memos, setMemos] = useState([])
  const [logicGroups, setLogicGroups] = useState([])
  const [stocks, setStocks] = useState([])
  const [selectedMemoId, setSelectedMemoId] = useState(null)
  const [showPanel, setShowPanel] = useState(false)
  const [editMemoId, setEditMemoId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editGroupIds, setEditGroupIds] = useState([])
  const [showNewForm, setShowNewForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newGroupIds, setNewGroupIds] = useState([])
  const [showStockPicker, setShowStockPicker] = useState(null)
  const [draggedId, setDraggedId] = useState(null)

  useEffect(() => {
    fetchMemos()
    fetchLogicGroups()
    fetchStocks()
  }, [])

  const fetchMemos = async () => {
    try {
      const res = await fetch(`${API}/memos`)
      const data = await res.json()
      setMemos(data)
      if (data.length > 0 && selectedMemoId === null) {
        setSelectedMemoId(data[0].id)
      }
    } catch (err) {
      console.error('Failed to fetch memos:', err)
    }
  }

  const fetchLogicGroups = async () => {
    try {
      const res = await fetch(`${API}/logic-groups`)
      const data = await res.json()
      setLogicGroups(data)
    } catch (err) {
      console.error('Failed to fetch logic groups:', err)
    }
  }

  const fetchStocks = async () => {
    try {
      const res = await fetch(`${API}/stocks`)
      const data = await res.json()
      setStocks(data)
    } catch (err) {
      console.error('Failed to fetch stocks:', err)
    }
  }

  const handleAddStocksToGroup = async (groupId, selectedStockIds) => {
    if (selectedStockIds.length === 0) {
      setShowStockPicker(null)
      return
    }
    try {
      await Promise.all(selectedStockIds.map(async (stockId) => {
        const stock = stocks.find(s => s.id === stockId)
        await fetch(`${API}/stocks/${stockId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: stock.name,
            logic_group_id: groupId,
            field_values: stock.field_values || {},
            notes: stock.notes || ''
          })
        })
      }))
      setShowStockPicker(null)
      fetchStocks()
    } catch (err) {
      console.error('Failed to add stocks to group:', err)
    }
  }

  const handleCreate = async () => {
    if (!newContent.trim()) return
    try {
      const res = await fetch(`${API}/memos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, content: newContent, logic_group_ids: newGroupIds })
      })
      const created = await res.json()
      setNewTitle('')
      setNewContent('')
      setNewGroupIds([])
      setShowNewForm(false)
      fetchMemos()
      setSelectedMemoId(created.id)
    } catch (err) {
      console.error('Failed to create memo:', err)
    }
  }

  const handleUpdate = async (id) => {
    try {
      await fetch(`${API}/memos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, content: editContent, logic_group_ids: editGroupIds })
      })
      setEditMemoId(null)
      setEditTitle('')
      setEditContent('')
      setEditGroupIds([])
      fetchMemos()
    } catch (err) {
      console.error('Failed to update memo:', err)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('确定删除这条备忘录？')) return
    try {
      await fetch(`${API}/memos/${id}`, { method: 'DELETE' })
      if (selectedMemoId === id) {
        setSelectedMemoId(memos.find(m => m.id !== id)?.id || null)
      }
      fetchMemos()
    } catch (err) {
      console.error('Failed to delete memo:', err)
    }
  }

  const handleGroupToggle = async (memoId, groupId, currentIds) => {
    const newIds = currentIds.includes(groupId)
      ? currentIds.filter(id => id !== groupId)
      : [...currentIds, groupId]
    try {
      await fetch(`${API}/memos/${memoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logic_group_ids: newIds })
      })
      fetchMemos()
    } catch (err) {
      console.error('Failed to update groups:', err)
    }
  }

  const startEdit = (memo, e) => {
    e.stopPropagation()
    setEditMemoId(memo.id)
    setEditTitle(memo.title || '')
    setEditContent(memo.content)
    setEditGroupIds(memo.logic_group_ids || [])
  }

  const cancelEdit = () => {
    setEditMemoId(null)
    setEditTitle('')
    setEditContent('')
    setEditGroupIds([])
  }

  const toggleGroupInForm = (groupId, currentIds, setFn) => {
    if (currentIds.includes(groupId)) {
      setFn(currentIds.filter(id => id !== groupId))
    } else {
      setFn([...currentIds, groupId])
    }
  }

  // Drag-and-drop reorder
  const handleDragStart = (e, memoId) => {
    setDraggedId(memoId)
    e.dataTransfer.effectAllowed = 'move'
  }
  const handleDragOver = (e, memoId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }
  const handleDrop = (e, targetId) => {
    e.preventDefault()
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null)
      return
    }
    const draggedIdx = memos.findIndex(m => m.id === draggedId)
    const targetIdx = memos.findIndex(m => m.id === targetId)
    if (draggedIdx < 0 || targetIdx < 0) {
      setDraggedId(null)
      return
    }
    const reordered = [...memos]
    const [dragged] = reordered.splice(draggedIdx, 1)
    reordered.splice(targetIdx, 0, dragged)
    setMemos(reordered)
    setDraggedId(null)
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const selectedMemo = memos.find(m => m.id === selectedMemoId)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h2 className="text-2xl font-bold text-white">宏观叙事</h2>
        <button
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors text-sm"
        >
          <Plus size={16} />
          新建叙事
        </button>
      </div>

      {/* Left-Right Split Layout */}
      <div className="flex gap-4 flex-1 min-h-0" style={{ height: 'calc(100vh - 180px)' }}>
        {/* Left: Narrative List (2/3) */}
        <div className="flex-1 flex flex-col min-h-0">

          {/* New memo form */}
          {showNewForm && (
            <div className="mb-3 bg-slate-800 rounded-lg p-4 border border-slate-700 shrink-0">
              <div className="mb-3">
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="叙事标题（可选）"
                  className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  autoFocus
                />
              </div>
              <div className="mb-3">
                <label className="block text-xs text-slate-400 mb-2">关联分组（可多选）</label>
                <div className="flex flex-wrap gap-1.5">
                  {logicGroups.map((group) => {
                    const isSelected = newGroupIds.includes(group.id)
                    return (
                      <button
                        key={group.id}
                        onClick={() => toggleGroupInForm(group.id, newGroupIds, setNewGroupIds)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                          isSelected ? 'text-white' : 'text-slate-400 hover:brightness-110'
                        }`}
                        style={{
                          borderColor: group.color,
                          backgroundColor: isSelected ? group.color : 'transparent',
                        }}
                      >
                        {group.name}
                      </button>
                    )
                  })}
                </div>
              </div>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="记录你的宏观叙事..."
                className="w-full h-20 bg-slate-700 text-white rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => { setShowNewForm(false); setNewTitle(''); setNewContent(''); setNewGroupIds([]) }}
                  className="px-3 py-1.5 text-slate-400 hover:text-white transition-colors text-sm"
                >
                  取消
                </button>
                <button
                  onClick={handleCreate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors text-sm"
                >
                  <Save size={14} />
                  保存
                </button>
              </div>
            </div>
          )}

          {/* Narrative cards — 3 per row, draggable */}
          <div className="flex-1 overflow-y-auto pr-1">
            {memos.length === 0 && !showNewForm ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <p className="text-sm">暂无宏观叙事</p>
                <button onClick={() => setShowNewForm(true)} className="mt-2 text-indigo-400 text-sm hover:underline">新建第一条叙事</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {memos.map((memo) => {
                  const isSelected = selectedMemoId === memo.id
                  const isEditing = editMemoId === memo.id
                  const isDragging = draggedId === memo.id
                  return (
                    <div
                      key={memo.id}
                      draggable={!isEditing}
                      onDragStart={(e) => handleDragStart(e, memo.id)}
                      onDragOver={(e) => handleDragOver(e, memo.id)}
                      onDrop={(e) => handleDrop(e, memo.id)}
                      onDragEnd={() => setDraggedId(null)}
                      onClick={() => {
                        if (!isEditing) {
                          setSelectedMemoId(memo.id)
                          setShowPanel(true)
                        }
                      }}
                      className={`
                        flex flex-col rounded-lg border transition-all cursor-pointer h-full
                        ${isDragging ? 'opacity-30' : ''}
                        ${isSelected
                          ? 'bg-slate-700 border-indigo-500 ring-1 ring-indigo-500'
                          : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                        }
                      `}
                    >
                      {isEditing ? (
                        <div className="p-3">
                          <div className="mb-3">
                            <input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              placeholder="叙事标题（可选）"
                              className="w-full bg-slate-600 text-white rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                            />
                          </div>
                          <div className="mb-2">
                            <label className="block text-xs text-slate-400 mb-1.5">关联分组</label>
                            <div className="flex flex-wrap gap-1.5">
                              {logicGroups.map((group) => {
                                const isGrpSelected = editGroupIds.includes(group.id)
                                return (
                                  <button
                                    key={group.id}
                                    onClick={(e) => { e.stopPropagation(); toggleGroupInForm(group.id, editGroupIds, setEditGroupIds) }}
                                    className={`px-2 py-0.5 rounded-full text-xs border transition-all ${
                                      isGrpSelected ? 'text-white' : 'text-slate-400'
                                    }`}
                                    style={{
                                      borderColor: group.color,
                                      backgroundColor: isGrpSelected ? group.color : 'transparent',
                                    }}
                                  >
                                    {group.name}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full h-20 bg-slate-600 text-white rounded p-2 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          />
                          <div className="flex justify-end gap-1.5 mt-2">
                            <button onClick={(e) => { e.stopPropagation(); cancelEdit() }} className="px-2 py-1 text-slate-400 hover:text-white text-xs">取消</button>
                            <button onClick={(e) => { e.stopPropagation(); handleUpdate(memo.id) }} className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 rounded text-xs">保存</button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 flex flex-col flex-1">
                          {/* Card header: drag handle + title */}
                          <div className="flex items-start gap-2 mb-2">
                            <GripVertical size={14} className="text-slate-600 shrink-0 mt-0.5 cursor-grab" />
                            {memo.title ? (
                              <h3 className="text-sm font-semibold text-white leading-snug flex-1 min-w-0">{memo.title}</h3>
                            ) : (
                              <p className="text-slate-500 text-xs italic flex-1 min-w-0">无标题</p>
                            )}
                            <ChevronRight size={16} className={`text-slate-500 shrink-0 transition-transform ${isSelected ? 'text-indigo-400 rotate-90' : ''}`} />
                          </div>

                          {/* Logic group badges */}
                          <div className="flex flex-wrap gap-1 mb-2">
                            {(memo.logic_groups || []).map((lg) => (
                              <span
                                key={lg.id}
                                className="px-1.5 py-0.5 text-xs font-medium rounded"
                                style={{ backgroundColor: lg.color + '30', color: lg.color }}
                              >
                                {lg.name}
                              </span>
                            ))}
                          </div>

                          {/* Content */}
                          <p className="text-slate-200 text-sm whitespace-pre-wrap line-clamp-3 min-w-0">{memo.content}</p>

                          {/* Footer */}
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700">
                            <span className="text-xs text-slate-500">{formatDate(memo.updated_at)}</span>
                            <div className="flex gap-1">
                              <button
                                onClick={(e) => startEdit(memo, e)}
                                className="p-1.5 text-slate-400 hover:text-indigo-400 transition-colors"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(memo.id) }}
                                className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Memo Detail Panel (1/3) */}
        {showPanel && (
          <div className="w-80 shrink-0 flex flex-col bg-slate-800 rounded-lg border border-slate-700">
            {!selectedMemo ? (
              <>
                <div className="px-4 py-3 border-b border-slate-700 shrink-0 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-200">叙事详情</h3>
                  <button
                    onClick={() => setShowPanel(false)}
                    className="p-1 text-slate-400 hover:text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 px-6">
                  <ChevronRight size={24} className="mb-3 opacity-50" style={{ transform: 'rotate(0deg)' }} />
                  <p className="text-sm text-center">请选择一个叙事<br />查看其关联分组和股票</p>
                </div>
              </>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-slate-700 shrink-0 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">{selectedMemo.title || '叙事详情'}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      关联 {(selectedMemo.logic_groups || []).length} 个分组
                    </p>
                  </div>
                  <button
                    onClick={() => setShowPanel(false)}
                    className="p-1 text-slate-400 hover:text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {(selectedMemo.logic_groups || []).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                      <Database size={24} className="mb-3 opacity-50" />
                      <p className="text-sm">该叙事暂无关联分组</p>
                      <p className="text-xs text-slate-600 mt-1">编辑叙事以关联分组</p>
                    </div>
                  ) : (
                    <div className="p-3 space-y-4">
                      {(selectedMemo.logic_groups || []).map((group) => {
                        const groupStocks = stocks.filter(s => s.logic_group_id === group.id)
                        return (
                          <div key={group.id} className="bg-slate-700 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: group.color }}
                              />
                              <span className="text-sm font-semibold text-white flex-1">{group.name}</span>
                              <span
                                className="px-1.5 py-0.5 rounded text-xs"
                                style={{ backgroundColor: group.color + '30', color: group.color }}
                              >
                                {groupStocks.length}
                              </span>
                              <button
                                onClick={() => setShowStockPicker(group.id)}
                                className="flex items-center gap-1 px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 rounded text-xs transition-colors"
                              >
                                <Plus size={11} />
                                添加股票
                              </button>
                            </div>
                            <div className="space-y-1">
                              {groupStocks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-4 text-slate-500">
                                  <Database size={16} className="mb-1 opacity-40" />
                                  <p className="text-xs">该分组暂无股票</p>
                                </div>
                              ) : (
                                groupStocks.map((stock) => (
                                  <button
                                    key={stock.id}
                                    onClick={(e) => { e.stopPropagation(); onStockClick?.(stock.id) }}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-600 transition-colors text-left"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full opacity-60 shrink-0" style={{ backgroundColor: group.color }} />
                                    <span className="text-sm text-slate-300">{stock.name}</span>
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Stock Picker Modal */}
      {showStockPicker !== null && (
        <StockPickerModal
          stocks={stocks}
          groupId={showStockPicker}
          onClose={() => setShowStockPicker(null)}
          onConfirm={(selectedIds) => handleAddStocksToGroup(showStockPicker, selectedIds)}
        />
      )}
    </div>
  )
}
