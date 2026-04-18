import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Save, X, ChevronRight, Database, GripVertical, FileText } from 'lucide-react'
import StockPickerModal from '../Stocks/StockPickerModal'

const API = '/api'

export default function MemoList({ onStockClick }) {
  const [memos, setMemos] = useState([])
  const [logicGroups, setLogicGroups] = useState([])
  const [stocks, setStocks] = useState([])
  const [selectedMemoId, setSelectedMemoId] = useState(null)
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
    if (selectedStockIds.length === 0) { setShowStockPicker(null); return }
    try {
      await Promise.all(selectedStockIds.map(async (stockId) => {
        const stock = stocks.find(s => s.id === stockId)
        await fetch(`${API}/stocks/${stockId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: stock.name, logic_group_id: groupId, field_values: stock.field_values || {}, notes: stock.notes || '' })
        })
      }))
      setShowStockPicker(null)
      fetchStocks()
    } catch (err) { console.error('Failed to add stocks to group:', err) }
  }

  const handleCreate = async () => {
    if (!newContent.trim()) return
    try {
      const res = await fetch(`${API}/memos`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, content: newContent, logic_group_ids: newGroupIds })
      })
      const created = await res.json()
      setNewTitle(''); setNewContent(''); setNewGroupIds([])
      setShowNewForm(false); fetchMemos(); setSelectedMemoId(created.id)
    } catch (err) { console.error('Failed to create memo:', err) }
  }

  const handleUpdate = async (id, { title, content, logic_group_ids }) => {
    try {
      await fetch(`${API}/memos/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, logic_group_ids })
      })
      fetchMemos()
    } catch (err) { console.error('Failed to update memo:', err) }
  }

  const handleDelete = async (id) => {
    if (!confirm('确定删除这条备忘录？')) return
    try {
      await fetch(`${API}/memos/${id}`, { method: 'DELETE' })
      if (selectedMemoId === id) setSelectedMemoId(memos.find(m => m.id !== id)?.id || null)
      fetchMemos()
    } catch (err) { console.error('Failed to delete memo:', err) }
  }

  const toggleGroupInForm = (groupId, currentIds, setFn) => {
    setFn(currentIds.includes(groupId) ? currentIds.filter(id => id !== groupId) : [...currentIds, groupId])
  }

  const handleDragStart = (e, memoId) => { setDraggedId(memoId); e.dataTransfer.effectAllowed = 'move' }
  const handleDragOver = (e, memoId) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }
  const handleDrop = (e, targetId) => {
    e.preventDefault()
    if (!draggedId || draggedId === targetId) { setDraggedId(null); return }
    const draggedIdx = memos.findIndex(m => m.id === draggedId)
    const targetIdx = memos.findIndex(m => m.id === targetId)
    if (draggedIdx < 0 || targetIdx < 0) { setDraggedId(null); return }
    const reordered = [...memos]
    const [dragged] = reordered.splice(draggedIdx, 1)
    reordered.splice(targetIdx, 0, dragged)
    setMemos(reordered); setDraggedId(null)
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  const selectedMemo = memos.find(m => m.id === selectedMemoId)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h2 className="text-2xl font-bold text-white">宏观叙事</h2>
        <button onClick={() => setShowNewForm(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors text-sm shadow-lg shadow-indigo-900/50">
          <Plus size={16} />新建叙事
        </button>
      </div>

      {/* New memo form */}
      {showNewForm && (
        <div className="mb-4 bg-slate-800/90 backdrop-blur rounded-xl p-5 border border-slate-600/50 shrink-0 shadow-xl shadow-slate-900/30">
          <div className="mb-3">
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="叙事标题（可选）"
              className="w-full bg-slate-700/80 text-white rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" autoFocus />
          </div>
          <div className="mb-3">
            <label className="block text-xs text-slate-400 mb-2">关联分组（可多选）</label>
            <div className="flex flex-wrap gap-2">
              {logicGroups.map((group) => {
                const isSelected = newGroupIds.includes(group.id)
                return (
                  <button key={group.id} onClick={() => toggleGroupInForm(group.id, newGroupIds, setNewGroupIds)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${isSelected ? 'text-white shadow-sm' : 'text-slate-400 hover:brightness-110'}`}
                    style={{ borderColor: group.color, backgroundColor: isSelected ? group.color : 'transparent', boxShadow: isSelected ? `0 0 8px ${group.color}40` : 'none' }}>
                    {group.name}
                  </button>
                )
              })}
            </div>
          </div>
          <textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="记录你的宏观叙事..."
            className="w-full h-32 bg-slate-700/80 text-white rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm leading-relaxed" autoFocus />
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => { setShowNewForm(false); setNewTitle(''); setNewContent(''); setNewGroupIds([]) }}
              className="px-4 py-1.5 text-slate-400 hover:text-white transition-colors text-sm">取消</button>
            <button onClick={handleCreate}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors text-sm shadow-lg shadow-indigo-900/40">
              <Save size={14} />保存
            </button>
          </div>
        </div>
      )}

      {/* Left-Right Split Layout */}
      <div className="flex gap-4 flex-1 min-h-0" style={{ height: 'calc(100vh - 220px)' }}>
        {/* Left: card list */}
        <div className="w-96 shrink-0 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto pr-1 pb-4 space-y-3">
            {memos.length === 0 && !showNewForm ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                <FileText size={32} className="mb-3 opacity-35" />
                <p className="text-sm">暂无宏观叙事</p>
              </div>
            ) : (
              memos.map((memo) => {
                const isSelected = selectedMemoId === memo.id
                const isDragging = draggedId === memo.id
                const primaryGroup = (memo.logic_groups || [])[0]
                const accentColor = primaryGroup?.color || '#6366f1'
                return (
                  <div key={memo.id} draggable onDragStart={(e) => handleDragStart(e, memo.id)}
                    onDragOver={(e) => handleDragOver(e, memo.id)} onDrop={(e) => handleDrop(e, memo.id)}
                    onDragEnd={() => setDraggedId(null)}
                    onClick={() => { setSelectedMemoId(memo.id) }}
                    className={`relative rounded-xl border overflow-hidden transition-all duration-200 cursor-pointer group ${isDragging ? 'opacity-30 scale-95' : ''} ${isSelected ? 'ring-2 shadow-xl shadow-indigo-900/40' : 'hover:shadow-lg hover:-translate-y-0.5 hover:border-slate-500/60'}`}
                    style={{
                      background: isSelected
                        ? `linear-gradient(135deg, #1e293b 0%, #1a1f35 100%)`
                        : `linear-gradient(135deg, #1e293b 0%, #151b28 100%)`,
                      borderColor: isSelected ? accentColor + 'aa' : '#334155',
                      boxShadow: isSelected ? `0 0 0 1px ${accentColor}30, 0 8px 32px -4px ${accentColor}20` : '0 4px 16px -4px rgba(0,0,0,0.3)',
                    }}>
                    {/* Top accent bar */}
                    <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}80)` }} />

                    <div className="p-4">
                      {/* Header */}
                      <div className="flex items-start gap-3 mb-3">
                        <GripVertical size={16} className="text-slate-600 shrink-0 mt-1 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex-1 min-w-0">
                          {memo.title ? (
                            <h3 className="text-base font-bold text-white leading-snug tracking-wide">{memo.title}</h3>
                          ) : (
                            <p className="text-slate-500 text-xs italic">无标题</p>
                          )}
                          <p className="text-[11px] text-slate-600 mt-1 font-mono">{formatDate(memo.updated_at)}</p>
                        </div>
                        <div className="shrink-0 mt-1">
                          <ChevronRight size={18} className={`text-slate-500 transition-all duration-200 ${isSelected ? 'text-indigo-400 translate-x-0.5' : ''}`} />
                        </div>
                      </div>

                      {/* Badges — larger & more vivid */}
                      {(memo.logic_groups || []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {(memo.logic_groups || []).map((lg) => (
                            <span key={lg.id} className="px-2.5 py-1 text-xs font-semibold rounded-full"
                              style={{
                                backgroundColor: lg.color + '25',
                                color: lg.color,
                                border: `1px solid ${lg.color}50`,
                                boxShadow: `0 0 6px ${lg.color}20`
                              }}>
                              {lg.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Content — slightly larger */}
                      <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap min-w-0">{memo.content}</p>

                      {/* Footer */}
                      <div className="flex items-center justify-end mt-3 pt-2.5 border-t border-slate-700/60 gap-1">
                        <button onClick={(e) => { e.stopPropagation(); setSelectedMemoId(memo.id) }}
                          className="p-1.5 text-slate-500 hover:text-indigo-400 transition-colors rounded-md hover:bg-indigo-500/10" title="编辑">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(memo.id) }}
                          className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded-md hover:bg-red-500/10" title="删除">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right: editor panel */}
        <div className="flex-1 min-h-0 flex flex-col">
          {!selectedMemo ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-800/60 backdrop-blur rounded-xl border border-slate-700/40 text-slate-500">
              <FileText size={44} className="mb-4 opacity-25" />
              <p className="text-sm text-center">从左侧选择一个叙事<br />开始编辑</p>
            </div>
          ) : (
            <MemoEditor
              key={selectedMemo.id}
              memo={selectedMemo}
              logicGroups={logicGroups}
              stocks={stocks}
              onUpdate={handleUpdate}
              onStockClick={onStockClick}
              onShowStockPicker={setShowStockPicker}
            />
          )}
        </div>
      </div>

      {showStockPicker && (
        <StockPickerModal onClose={() => setShowStockPicker(null)} onAdd={handleAddStocksToGroup} groupId={showStockPicker} />
      )}
    </div>
  )
}

// ─── Memo Editor ───────────────────────────────────────────────────────────────
function MemoEditor({ memo, logicGroups, stocks, onUpdate, onStockClick, onShowStockPicker }) {
  const [title, setTitle] = useState(memo.title || '')
  const [content, setContent] = useState(memo.content || '')
  const [groupIds, setGroupIds] = useState(memo.logic_group_ids || [])

  useEffect(() => { setTitle(memo.title || ''); setContent(memo.content || ''); setGroupIds(memo.logic_group_ids || []) }, [memo.id])

  const handleSave = () => onUpdate(memo.id, { title, content, logic_group_ids: groupIds })
  const toggleGroup = (groupId) => setGroupIds(prev => prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId])
  const isDirty = title !== memo.title || content !== memo.content ||
    JSON.stringify([...groupIds].sort()) !== JSON.stringify([...(memo.logic_group_ids || []).sort()])

  const selectedGroups = logicGroups.filter(g => groupIds.includes(g.id))

  return (
    <div className="flex-1 flex flex-col bg-slate-800/80 backdrop-blur rounded-xl border border-slate-600/40 min-h-0 shadow-2xl shadow-slate-900/40">
      <div className="px-5 py-4 border-b border-slate-700/60 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">{memo.title || '叙事详情'}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {memo.updated_at ? new Date(memo.updated_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isDirty && <span className="text-xs text-amber-400 animate-pulse">未保存</span>}
            <button onClick={handleSave} disabled={!isDirty}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm transition-all ${isDirty ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/40' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}>
              <Save size={14} />保存
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div>
          <label className="block text-xs text-slate-400 mb-2 font-medium tracking-wide">标题</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="给这个叙事起个标题..."
            className="w-full bg-slate-700/70 text-white rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-2 font-medium tracking-wide">叙事内容</label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="写下你的宏观叙事..."
            className="w-full min-h-[240px] bg-slate-700/70 text-white rounded-lg p-3 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm leading-relaxed"
            style={{ minHeight: '240px' }} />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-2 font-medium tracking-wide">关联分组</label>
          <div className="flex flex-wrap gap-2">
            {logicGroups.map((group) => {
              const isSelected = groupIds.includes(group.id)
              return (
                <button key={group.id} onClick={() => toggleGroup(group.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${isSelected ? 'text-white' : 'text-slate-400'}`}
                  style={{ borderColor: group.color, backgroundColor: isSelected ? group.color : 'transparent', boxShadow: isSelected ? `0 0 8px ${group.color}40` : 'none' }}>
                  {group.name}
                </button>
              )
            })}
          </div>
        </div>
        {selectedGroups.length > 0 && (
          <div>
            <label className="block text-xs text-slate-400 mb-3 font-medium tracking-wide">关联股票</label>
            <div className="space-y-4">
              {selectedGroups.map((group) => {
                const groupStocks = stocks.filter(s => s.logic_group_id === group.id)
                return (
                  <div key={group.id} className="bg-slate-700/50 rounded-xl p-4 border border-slate-600/30">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: group.color, boxShadow: `0 0 6px ${group.color}` }} />
                      <span className="text-sm font-semibold text-white flex-1">{group.name}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{ backgroundColor: group.color + '25', color: group.color }}>{groupStocks.length}</span>
                      <button onClick={() => onShowStockPicker(group.id)}
                        className="flex items-center gap-1 px-2.5 py-0.5 bg-indigo-600/80 hover:bg-indigo-600 rounded-lg text-xs transition-colors">
                        <Plus size={11} />添加
                      </button>
                    </div>
                    {groupStocks.length === 0
                      ? <p className="text-xs text-slate-500 pl-4">暂无关联股票</p>
                      : <div className="space-y-1 pl-4">
                          {groupStocks.map((stock) => (
                            <div key={stock.id} onClick={() => onStockClick(stock)}
                              className="flex items-center gap-2 text-sm text-slate-300 hover:text-indigo-300 cursor-pointer py-1.5 rounded-md hover:bg-slate-600/30 px-2 -mx-2 transition-colors">
                              <ChevronRight size={13} className="text-slate-600" /><span>{stock.name}</span>
                            </div>
                          ))}
                        </div>
                    }
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
