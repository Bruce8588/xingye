import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Save, X, ChevronRight, Calendar, TrendingUp } from 'lucide-react'

const API = '/api'

export default function ReviewList() {
  const [reviews, setReviews] = useState([])
  const [selectedReview, setSelectedReview] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingReview, setEditingReview] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    review_date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchReviews()
  }, [])

  const fetchReviews = async () => {
    try {
      const res = await fetch(`${API}/reviews`)
      if (res.ok) {
        const data = await res.json()
        setReviews(data)
      }
    } catch (err) {
      console.error('Failed to fetch reviews:', err)
    }
  }

  const handleSave = async () => {
    if (!formData.title.trim()) return
    try {
      if (editingReview) {
        await fetch(`${API}/reviews/${editingReview.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })
      } else {
        await fetch(`${API}/reviews`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })
      }
      setShowForm(false)
      setEditingReview(null)
      setFormData({ title: '', content: '', review_date: new Date().toISOString().split('T')[0] })
      fetchReviews()
    } catch (err) {
      console.error('Failed to save review:', err)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('确定删除这条复盘？')) return
    try {
      await fetch(`${API}/reviews/${id}`, { method: 'DELETE' })
      if (selectedReview?.id === id) setSelectedReview(null)
      fetchReviews()
    } catch (err) {
      console.error('Failed to delete review:', err)
    }
  }

  const handleEdit = (review) => {
    setEditingReview(review)
    setFormData({
      title: review.title,
      content: review.content || '',
      review_date: review.review_date || new Date().toISOString().split('T')[0]
    })
    setShowForm(true)
  }

  // Detail view
  if (selectedReview) {
    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => setSelectedReview(null)}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
        >
          ← 返回列表
        </button>

        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-700 flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{selectedReview.title}</h2>
              <div className="flex items-center gap-4 text-slate-400 text-sm">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {selectedReview.review_date}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(selectedReview)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Edit2 size={18} />
              </button>
              <button
                onClick={() => handleDelete(selectedReview.id)}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="prose prose-invert max-w-none">
              <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                {selectedReview.content || '暂无内容'}
              </p>
            </div>
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl">
              <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">编辑复盘</h3>
                <button onClick={() => { setShowForm(false); setEditingReview(null) }} className="text-slate-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">标题 *</label>
                  <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="如：2026-04-09 复盘" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">日期</label>
                  <input type="date" value={formData.review_date} onChange={(e) => setFormData({ ...formData, review_date: e.target.value })}
                    className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">内容</label>
                  <textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    rows={12} placeholder="记录交易复盘内容..." />
                </div>
              </div>
              <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
                <button onClick={() => { setShowForm(false); setEditingReview(null) }}
                  className="px-6 py-2 text-slate-400 hover:text-white transition-colors">取消</button>
                <button onClick={handleSave}
                  className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
                  <Save size={18} />保存
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Form modal
  if (showForm) {
    return (
      <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl">
          <div className="p-6 border-b border-slate-700 flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">添加复盘</h3>
            <button onClick={() => { setShowForm(false); setFormData({ title: '', content: '', review_date: new Date().toISOString().split('T')[0] }) }}
              className="text-slate-400 hover:text-white"><X size={24} /></button>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">标题 *</label>
              <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="如：2026-04-09 复盘" autoFocus />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">日期</label>
              <input type="date" value={formData.review_date} onChange={(e) => setFormData({ ...formData, review_date: e.target.value })}
                className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">内容</label>
              <textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={12} placeholder="记录交易复盘内容..." />
            </div>
          </div>
          <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
            <button onClick={() => { setShowForm(false); setFormData({ title: '', content: '', review_date: new Date().toISOString().split('T')[0] }) }}
              className="px-6 py-2 text-slate-400 hover:text-white transition-colors">取消</button>
            <button onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
              <Save size={18} />保存
            </button>
          </div>
        </div>
      </div>
    )
  }

  // List view
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            交易复盘
            <span className="text-sm font-normal text-slate-400">{reviews.length} 条</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">记录每日交易心得和总结</p>
        </div>
        <button
          onClick={() => {
            setFormData({ title: '', content: '', review_date: new Date().toISOString().split('T')[0] })
            setShowForm(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
        >
          <Plus size={18} />添加复盘
        </button>
      </div>

      {reviews.length === 0 ? (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
          <TrendingUp size={64} className="mx-auto text-slate-600 mb-4" />
          <h3 className="text-xl font-semibold text-slate-300 mb-2">暂无复盘记录</h3>
          <p className="text-slate-500 mb-6">点击添加按钮，记录你的第一篇交易复盘</p>
          <button
            onClick={() => {
              setFormData({ title: `复盘-${new Date().toLocaleDateString('zh-CN')}`, content: '', review_date: new Date().toISOString().split('T')[0] })
              setShowForm(true)
            }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            <Plus size={18} />添加复盘
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {reviews.sort((a, b) => new Date(b.review_date) - new Date(a.review_date)).map((review) => (
            <div
              key={review.id}
              onClick={() => setSelectedReview(review)}
              className="bg-slate-800 rounded-xl border border-slate-700 p-5 cursor-pointer hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-white text-lg group-hover:text-indigo-400 transition-colors">
                      {review.title}
                    </h3>
                    <span className="flex items-center gap-1 text-slate-500 text-sm">
                      <Calendar size={12} />
                      {review.review_date}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm line-clamp-2">
                    {review.content || '暂无内容'}
                  </p>
                </div>
                <div className="flex gap-1 ml-4" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => handleEdit(review)}
                    className="p-2 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(review.id)}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
