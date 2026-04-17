import { useState, useEffect } from 'react'
import { Plus, Trash2, BarChart3 } from 'lucide-react'

const API = '/api'

export default function MarketInfoList() {
  const [entries, setEntries] = useState([])
  const [input, setInput] = useState('')
  const [showInput, setShowInput] = useState(false)

  useEffect(() => {
    fetchEntries()
  }, [])

  const fetchEntries = async () => {
    try {
      const res = await fetch(`${API}/market-entries`)
      const data = await res.json()
      setEntries(data)
    } catch (err) {
      console.error('Failed to fetch entries:', err)
    }
  }

  const handleSubmit = async () => {
    if (!input.trim()) return
    try {
      await fetch(`${API}/market-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: input.trim() })
      })
      setInput('')
      setShowInput(false)
      fetchEntries()
    } catch (err) {
      console.error('Failed to save entry:', err)
    }
  }

  const handleDelete = async (id) => {
    try {
      await fetch(`${API}/market-entries/${id}`, { method: 'DELETE' })
      fetchEntries()
    } catch (err) {
      console.error('Failed to delete entry:', err)
    }
  }

  const formatTime = (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now - date
    
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">市场简讯</h2>
        <button
          onClick={() => setShowInput(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
        >
          <Plus size={18} />
          记录
        </button>
      </div>

      {/* Quick Input */}
      {showInput && (
        <div className="mb-6 bg-slate-800 rounded-lg p-4 border border-slate-700">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="记录一条简讯..."
            className="w-full bg-slate-700 text-white rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
          />
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => { setShowInput(false); setInput('') }}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
            >
              发布
            </button>
          </div>
        </div>
      )}

      {/* Feed */}
      <div className="space-y-3">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="bg-slate-800 rounded-lg p-4 relative group"
          >
            <p className="text-slate-200 whitespace-pre-wrap">{entry.title}</p>
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-slate-500">{formatTime(entry.created_at)}</span>
              <button
                onClick={() => handleDelete(entry.id)}
                className="p-1 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {entries.length === 0 && !showInput && (
        <div className="text-center text-slate-500 py-16">
          <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
          <p>暂无简讯</p>
          <p className="text-sm mt-1">点击"记录"开始</p>
        </div>
      )}
    </div>
  )
}
