import { useState, useEffect } from 'react'
import { BookOpen, Plus, Trash2, RefreshCw } from 'lucide-react'

const API = '/api'

export default function TradingReview() {
  const [reviews, setReviews] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [newContent, setNewContent] = useState('')

  useEffect(() => {
    fetchReviews()
  }, [])

  const fetchReviews = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/trading-reviews`)
      const data = await res.json()
      setReviews(data)
    } catch (err) {
      console.error('Failed to fetch reviews:', err)
    }
    setLoading(false)
  }

  const handleSubmit = async () => {
    if (!newContent.trim()) return
    try {
      await fetch(`${API}/trading-reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent })
      })
      setNewContent('')
      setShowForm(false)
      fetchReviews()
    } catch (err) {
      console.error('Failed to save review:', err)
    }
  }

  const handleDelete = async (id) => {
    try {
      await fetch(`${API}/trading-reviews/${id}`, { method: 'DELETE' })
      fetchReviews()
    } catch (err) {
      console.error('Failed to delete review:', err)
    }
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-indigo-400" size={32} />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BookOpen className="text-indigo-400" size={28} />
          <h2 className="text-2xl font-bold text-white">交易复盘</h2>
          <span className="text-slate-500 text-sm">{reviews.length} 条记录</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchReviews} className="p-2 bg-slate-700 rounded-lg text-slate-400 hover:text-white hover:bg-slate-600 transition-colors" title="刷新">
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            <Plus size={18} />
            添加复盘
          </button>
        </div>
      </div>

      {/* 添加表单 */}
      {showForm && (
        <div className="mb-6 bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">新增复盘</h3>
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="写下你的交易复盘..."
            rows={6}
            className="w-full bg-slate-700 text-white rounded px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => { setShowForm(false); setNewContent('') }}
              className="px-4 py-2 text-slate-400 hover:text-white"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium"
            >
              保存
            </button>
          </div>
        </div>
      )}

      {/* 复盘列表 */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="bg-slate-800 rounded-lg p-5 border border-slate-700 group">
            <div className="flex items-start justify-between">
              <p className="text-slate-300 whitespace-pre-wrap flex-1">{review.content}</p>
              <button
                onClick={() => handleDelete(review.id)}
                className="p-2 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 ml-4"
              >
                <Trash2 size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-3">{formatDate(review.created_at)}</p>
          </div>
        ))}

        {reviews.length === 0 && !showForm && (
          <div className="text-center text-slate-500 py-16">
            <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
            <p>暂无复盘记录</p>
            <p className="text-sm mt-1">点击"添加复盘"开始记录</p>
          </div>
        )}
      </div>
    </div>
  )
}
