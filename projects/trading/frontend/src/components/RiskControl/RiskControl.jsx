import { useState, useEffect } from 'react'
import { Target, Plus, Trash2, Clock, TrendingDown, AlertTriangle, RefreshCw } from 'lucide-react'

const API = '/api'

export default function RiskControl() {
  const [decisions, setDecisions] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    stock_name: '',
    decision: '',
    max_risk: '',
    buy_price: '',
    stop_loss: '',
    position_period: '',
  })

  useEffect(() => {
    fetchDecisions()
  }, [])

  const fetchDecisions = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/decisions`)
      const data = await res.json()
      setDecisions(data)
    } catch (err) {
      console.error('Failed to fetch decisions:', err)
    }
    setLoading(false)
  }

  const handleSubmit = async () => {
    if (!form.stock_name || !form.decision) return
    try {
      await fetch(`${API}/decisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          max_risk: parseFloat(form.max_risk) || 0,
          buy_price: parseFloat(form.buy_price) || 0,
          stop_loss: parseFloat(form.stop_loss) || 0,
        })
      })
      setForm({ stock_name: '', decision: '', max_risk: '', buy_price: '', stop_loss: '', position_period: '' })
      setShowForm(false)
      fetchDecisions()
    } catch (err) {
      console.error('Failed to save decision:', err)
    }
  }

  const handleDelete = async (id) => {
    try {
      await fetch(`${API}/decisions/${id}`, { method: 'DELETE' })
      fetchDecisions()
    } catch (err) {
      console.error('Failed to delete decision:', err)
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
          <Target className="text-indigo-400" size={28} />
          <h2 className="text-2xl font-bold text-white">决策与风控</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchDecisions} className="p-2 text-slate-400 hover:text-white" title="刷新">
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            <Plus size={18} />
            记录决策
          </button>
        </div>
      </div>

      {/* 记录表单 */}
      {showForm && (
        <div className="mb-6 bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">新增投资决策</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-slate-400 text-sm mb-1">股票名称 *</label>
              <input
                value={form.stock_name}
                onChange={(e) => setForm({ ...form, stock_name: e.target.value })}
                placeholder="如：铜陵有色"
                className="w-full bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1">决策内容 *</label>
              <textarea
                value={form.decision}
                onChange={(e) => setForm({ ...form, decision: e.target.value })}
                placeholder="描述你的投资决策逻辑..."
                rows={3}
                className="w-full bg-slate-700 text-white rounded px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-slate-400 text-sm mb-1">最大风险 (%)</label>
                <input
                  type="number"
                  value={form.max_risk}
                  onChange={(e) => setForm({ ...form, max_risk: e.target.value })}
                  placeholder="如：10"
                  className="w-full bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1">买入价格</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.buy_price}
                  onChange={(e) => setForm({ ...form, buy_price: e.target.value })}
                  placeholder="如：4.02"
                  className="w-full bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1">止损价格</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.stop_loss}
                  onChange={(e) => setForm({ ...form, stop_loss: e.target.value })}
                  placeholder="如：3.70"
                  className="w-full bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1">持仓时长</label>
                <input
                  value={form.position_period}
                  onChange={(e) => setForm({ ...form, position_period: e.target.value })}
                  placeholder="如：3个月"
                  className="w-full bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => { setShowForm(false); setForm({ stock_name: '', decision: '', max_risk: '', buy_price: '', stop_loss: '', position_period: '' }) }}
              className="px-4 py-2 text-slate-400 hover:text-white"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg"
            >
              保存决策
            </button>
          </div>
        </div>
      )}

      {/* 决策列表 */}
      <div className="space-y-4">
        {decisions.map((item) => (
          <div key={item.id} className="bg-slate-800 rounded-lg p-5 border border-slate-700 group">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-white text-lg">{item.stock_name}</h3>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock size={12} />
                    {formatDate(item.created_at)}
                  </span>
                </div>
                <p className="text-slate-300 mb-3">{item.decision}</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  {item.max_risk > 0 && (
                    <span className="flex items-center gap-1 text-orange-400">
                      <TrendingDown size={14} />
                      最大风险：{item.max_risk}%
                    </span>
                  )}
                  {item.buy_price > 0 && (
                    <span className="text-slate-400">买入价：{item.buy_price}</span>
                  )}
                  {item.stop_loss > 0 && (
                    <span className="flex items-center gap-1 text-red-400">
                      <AlertTriangle size={14} />
                      止损价：{item.stop_loss}
                    </span>
                  )}
                  {item.position_period && (
                    <span className="text-slate-400">持仓时长：{item.position_period}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                className="p-2 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}

        {decisions.length === 0 && !showForm && (
          <div className="text-center text-slate-500 py-16">
            <Target size={48} className="mx-auto mb-4 opacity-50" />
            <p>暂无投资决策记录</p>
            <p className="text-sm mt-1">点击"记录决策"开始</p>
          </div>
        )}
      </div>
    </div>
  )
}
