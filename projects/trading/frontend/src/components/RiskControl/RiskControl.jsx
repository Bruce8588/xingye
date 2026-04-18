import { useState, useEffect } from 'react'
import {
  Target, Plus, Trash2, Clock,
  RefreshCw, ChevronDown, ChevronUp, Check, X, TrendingUp,
  Wallet, BarChart2, Layers, Edit3, Save, XCircle, FileText, Lightbulb
} from 'lucide-react'

const API = '/api'

const MARKET_TYPE_OPTIONS = [
  { value: 'high_vol', label: '高波动' },
  { value: 'low_vol', label: '低波动' },
]

const TRADE_MODEL_OPTIONS = [
  { value: 'double_support', label: '双重支撑模型' },
  { value: 'fall_rebound', label: '下跌转势模型' },
]

const ENTRY_TYPE_OPTIONS = [
  { value: 'high_entry', label: '高位买入' },
  { value: 'low_entry', label: '低位买入' },
]

const EMPTY_FORM = {
  stock_name: '',
  max_risk: '',
  buy_price: '',
  stop_loss: '',
  quantity: '',
  market_type: '',
  trade_model: '',
  entry_type: '',
  entry_logic: '突破关键阻力位，量能放大，站上均线系统',
  expectation: '目标涨幅 X%，止损下方 X%',
  current_trend: '当前处于 [上涨/震荡/下跌] 阶段，[描述走势]',
  sell_price: '',
  status: 'active',
}

export default function RiskControl() {
  const [decisions, setDecisions] = useState([])
  const [stats, setStats] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [expandedCards, setExpandedCards] = useState(new Set())
  const [showCompleted, setShowCompleted] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [totalCapital, setTotalCapital] = useState(100000)
  const [editingCapital, setEditingCapital] = useState(false)
  const [capitalInput, setCapitalInput] = useState('')
  const [logicModal, setLogicModal] = useState({ open: false, title: '', content: '', decisionId: null, field: '' })
  const [modalEditing, setModalEditing] = useState(false)
  const [modalDraft, setModalDraft] = useState('')
  const [hasUnsavedCapital, setHasUnsavedCapital] = useState(false)

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [decRes, statsRes, rulesRes] = await Promise.all([
        fetch(`${API}/decisions`),
        fetch(`${API}/decisions/stats`),
        fetch(`${API}/risk-rules`),
      ])
      const decisionsData = await decRes.json()
      const statsData = await statsRes.json()
      const rulesData = await rulesRes.json()
      setDecisions(decisionsData)
      setStats(statsData)
      setTotalCapital(statsData.total_capital || 100000)
      setCapitalInput(String(statsData.total_capital || 100000))
    } catch (err) {
      console.error('Failed to fetch:', err)
    }
    setLoading(false)
  }

  // 不触发 loading 的轻量刷新，仅更新 decisions
  const refreshDecisions = async () => {
    try {
      const [decRes, statsRes] = await Promise.all([
        fetch(`${API}/decisions`),
        fetch(`${API}/decisions/stats`),
      ])
      setDecisions(await decRes.json())
      const statsData = await statsRes.json()
      setStats(statsData)
      setTotalCapital(statsData.total_capital || 100000)
      setCapitalInput(String(statsData.total_capital || 100000))
    } catch (err) {
      console.error('Failed to refresh:', err)
    }
  }

  const activeDecisions = decisions.filter(d => d.status === 'active')
  const completedDecisions = decisions.filter(d => d.status === 'completed')

  // 自动计算 max_risk
  const calcMaxRisk = (buy, stop) => {
    if (!buy || !stop || parseFloat(buy) === 0) return ''
    const risk = ((parseFloat(buy) - parseFloat(stop)) / parseFloat(buy) * 100).toFixed(2)
    return risk
  }

  const handleBuyPriceChange = (val) => {
    const autoRisk = calcMaxRisk(val, form.stop_loss)
    setForm({ ...form, buy_price: val, max_risk: autoRisk })
  }

  const handleStopLossChange = (val) => {
    const autoRisk = calcMaxRisk(form.buy_price, val)
    setForm({ ...form, stop_loss: val, max_risk: autoRisk })
  }

  const handleSaveCapital = async () => {
    const val = parseFloat(capitalInput)
    if (!val || val <= 0) return
    try {
      await fetch(`${API}/risk-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ total_capital: val }),
      })
      setTotalCapital(val)
      setEditingCapital(false)
      setHasUnsavedCapital(false)
      fetchAll()
    } catch (err) {
      console.error('Failed to save capital:', err)
    }
  }

  const handleSubmit = async () => {
    if (!form.stock_name) return
    try {
      const payload = {
        stock_name: form.stock_name,
        max_risk: parseFloat(form.max_risk) || 0,
        buy_price: parseFloat(form.buy_price) || 0,
        stop_loss: parseFloat(form.stop_loss) || 0,
        quantity: parseFloat(form.quantity) || 0,
        sell_price: parseFloat(form.sell_price) || 0,
        market_type: form.market_type,
        trade_model: form.trade_model,
        entry_type: form.entry_type,
        entry_logic: form.entry_logic,
        expectation: form.expectation,
        current_trend: form.current_trend,
        status: form.status,
      }
      if (editingId) {
        await fetch(`${API}/decisions/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        await fetch(`${API}/decisions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      setForm({ ...EMPTY_FORM })
      setShowForm(false)
      setEditingId(null)
      fetchAll()
    } catch (err) {
      console.error('Failed to save:', err)
    }
  }

  const handleComplete = async (decision) => {
    const sellPrice = prompt(`记录卖出价格（${decision.stock_name}）:`, decision.sell_price || '')
    if (sellPrice === null) return
    try {
      await fetch(`${API}/decisions/${decision.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...decision,
          sell_price: parseFloat(sellPrice) || 0,
          status: 'completed',
        }),
      })
      fetchAll()
    } catch (err) {
      console.error('Failed to complete:', err)
    }
  }

  const handleEdit = (decision) => {
    setForm({
      stock_name: decision.stock_name,
      max_risk: decision.max_risk || '',
      buy_price: decision.buy_price || '',
      stop_loss: decision.stop_loss || '',
      quantity: decision.quantity || '',
      market_type: decision.market_type || '',
      trade_model: decision.trade_model || '',
      entry_type: decision.entry_type || '',
      entry_logic: decision.entry_logic || '',
      expectation: decision.expectation || '',
      current_trend: decision.current_trend || '',
      sell_price: decision.sell_price || '',
      status: decision.status,
    })
    setEditingId(decision.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('确定删除这笔交易记录？')) return
    try {
      await fetch(`${API}/decisions/${id}`, { method: 'DELETE' })
      fetchAll()
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  const toggleExpand = (id) => {
    const newSet = new Set(expandedCards)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setExpandedCards(newSet)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  const pnlColor = (pnl) => {
    if (pnl > 0) return 'text-green-400'
    if (pnl < 0) return 'text-red-400'
    return 'text-slate-400'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-indigo-400" size={32} />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* 逻辑/预期弹窗 */}
      {logicModal.open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => { setLogicModal({ open: false, title: '', content: '', decisionId: null, field: '' }); setModalEditing(false); setModalDraft('') }}>
          <div className="bg-slate-800 rounded-xl border border-slate-600 p-6 max-w-lg w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">{logicModal.title}</h3>
              <button onClick={() => { setLogicModal({ open: false, title: '', content: '', decisionId: null, field: '' }); setModalEditing(false); setModalDraft('') }} className="text-slate-400 hover:text-white">
                <XCircle size={20} />
              </button>
            </div>
            {modalEditing ? (
              <textarea
                value={modalDraft}
                onChange={e => {
                  setModalDraft(e.target.value)
                  // 自动保存（防抖 2s），静默更新不闪屏
                  clearTimeout(window._modalSaveTimer)
                  window._modalSaveTimer = setTimeout(async () => {
                    try {
                      await fetch(`${API}/decisions/${logicModal.decisionId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ [logicModal.field]: e.target.value }),
                      })
                      refreshDecisions()
                    } catch (err) {
                      console.error('Failed to save:', err)
                    }
                  }, 2000)
                }}
                rows={6}
                className="w-full bg-slate-700 text-white rounded px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
            ) : (
              <div
                onClick={() => { setModalDraft(logicModal.content); setModalEditing(true) }}
                className="cursor-pointer hover:bg-slate-700/50 rounded p-2 -m-2 transition-colors"
              >
                <p className="text-slate-300 whitespace-pre-wrap text-sm leading-relaxed">{logicModal.content || '暂无内容，点击添加'}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Target className="text-indigo-400" size={28} />
          <h2 className="text-2xl font-bold text-white">决策与风控</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAll} className="p-2 text-slate-400 hover:text-white" title="刷新">
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm({ ...EMPTY_FORM }) }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            <Plus size={18} />
            记录交易
          </button>
        </div>
      </div>

      {/* 账户概览 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {/* 总资金（可编辑） */}
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <Wallet size={16} />
              <span>总资金</span>
              <button onClick={() => { setEditingCapital(true); setCapitalInput(String(totalCapital)) }} className="ml-auto text-indigo-400 hover:text-indigo-300">
                <Edit3 size={13} />
              </button>
            </div>
            {editingCapital ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={capitalInput}
                  onChange={(e) => { setCapitalInput(e.target.value); setHasUnsavedCapital(true) }}
                  className="w-full bg-slate-700 text-white text-xl font-bold rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
                <button onClick={handleSaveCapital} className="text-green-400 hover:text-green-300"><Check size={18} /></button>
                <button onClick={() => { setEditingCapital(false); setCapitalInput(String(totalCapital)); setHasUnsavedCapital(false) }} className="text-slate-400 hover:text-white"><X size={18} /></button>
              </div>
            ) : (
              <div className={`text-xl font-bold ${hasUnsavedCapital ? 'text-yellow-400' : 'text-white'}`}>
                ¥{totalCapital.toLocaleString()}
              </div>
            )}
          </div>
          <StatCard
            icon={<BarChart2 size={16} />}
            label="资金占用"
            value={`${stats.capital_utilization}%`}
            sub={`¥${stats.active_capital.toLocaleString()}`}
            color="text-yellow-400"
          />
          <StatCard
            icon={<TrendingUp size={16} />}
            label="胜率"
            value={`${stats.win_rate}%`}
            sub={`${stats.win_count}胜 / ${stats.completed_count}笔`}
            color="text-blue-400"
          />
          <StatCard
            icon={<Layers size={16} />}
            label="总盈亏"
            value={`${stats.total_pnl >= 0 ? '+' : ''}¥${stats.total_pnl.toLocaleString()}`}
            sub={`${stats.total_return}%`}
            color={stats.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}
          />
        </div>
      )}

      {/* 交易表单 */}
      {showForm && (
        <div className="mb-6 bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">
            {editingId ? '编辑交易' : '新交易记录'}
          </h3>
          <div className="space-y-4">
            {/* 股票名称 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 text-sm mb-1">股票名称 *</label>
                <input
                  value={form.stock_name}
                  onChange={(e) => setForm({ ...form, stock_name: e.target.value })}
                  placeholder="如：铜陵有色"
                  className="w-full bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* 市场环境 - 点击选择 */}
            <div>
              <label className="block text-slate-400 text-sm mb-2">市场环境</label>
              <div className="flex gap-3">
                {MARKET_TYPE_OPTIONS.map(o => (
                  <label
                    key={o.value}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer border transition-colors ${
                      form.market_type === o.value
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                        : 'bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <input
                      type="radio"
                      name="market_type"
                      value={o.value}
                      checked={form.market_type === o.value}
                      onChange={() => setForm({ ...form, market_type: o.value })}
                      className="hidden"
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </div>

            {/* 交易模型 - 点击选择 */}
            <div>
              <label className="block text-slate-400 text-sm mb-2">交易模型</label>
              <div className="flex gap-3">
                {TRADE_MODEL_OPTIONS.map(o => (
                  <label
                    key={o.value}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer border transition-colors ${
                      form.trade_model === o.value
                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                        : 'bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <input
                      type="radio"
                      name="trade_model"
                      value={o.value}
                      checked={form.trade_model === o.value}
                      onChange={() => setForm({ ...form, trade_model: o.value })}
                      className="hidden"
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </div>

            {/* 买入方式 - 点击选择 */}
            <div>
              <label className="block text-slate-400 text-sm mb-2">买入方式</label>
              <div className="flex gap-3">
                {ENTRY_TYPE_OPTIONS.map(o => (
                  <label
                    key={o.value}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer border transition-colors ${
                      form.entry_type === o.value
                        ? (o.value === 'high_entry' ? 'bg-orange-500/20 border-orange-500/50 text-orange-300' : 'bg-green-500/20 border-green-500/50 text-green-300')
                        : 'bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <input
                      type="radio"
                      name="entry_type"
                      value={o.value}
                      checked={form.entry_type === o.value}
                      onChange={() => setForm({ ...form, entry_type: o.value })}
                      className="hidden"
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </div>

            {/* 买入信息 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-slate-400 text-sm mb-1">买入价格</label>
                <input
                  type="number" step="0.01"
                  value={form.buy_price}
                  onChange={(e) => handleBuyPriceChange(e.target.value)}
                  placeholder="如：12.50"
                  className="w-full bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1">买入数量（股）</label>
                <input
                  type="number"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  placeholder="如：1000"
                  className="w-full bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1">止损价格</label>
                <input
                  type="number" step="0.01"
                  value={form.stop_loss}
                  onChange={(e) => handleStopLossChange(e.target.value)}
                  placeholder="如：11.50"
                  className="w-full bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1">最大风险（%）
                  <span className="text-slate-500 text-xs ml-1">（自动计算）</span>
                </label>
                <input
                  type="number" step="0.01"
                  value={form.max_risk}
                  readOnly
                  placeholder="自动计算"
                  className="w-full bg-slate-700/50 text-slate-400 rounded px-3 py-2 cursor-not-allowed"
                />
              </div>
            </div>

            {/* 自动计算预览 */}
            {form.buy_price && form.quantity && (
              <div className="bg-slate-700/50 rounded p-3 text-sm grid grid-cols-3 gap-4">
                <CalcItem label="买入金额" value={`¥${(parseFloat(form.buy_price) * parseFloat(form.quantity)).toFixed(2)}`} />
                <CalcItem label="单笔风险金额" value={`¥${form.stop_loss ? Math.max(0, (parseFloat(form.buy_price) - parseFloat(form.stop_loss)) * parseFloat(form.quantity)).toFixed(2) : '—'}`} />
                <CalcItem label="占总资金" value={`${((parseFloat(form.buy_price) * parseFloat(form.quantity)) / totalCapital * 100).toFixed(1)}%`} />
              </div>
            )}

            {/* 买入逻辑 */}
            <div>
              <label className="block text-slate-400 text-sm mb-1">买入逻辑</label>
              <textarea
                value={form.entry_logic}
                onChange={(e) => setForm({ ...form, entry_logic: e.target.value })}
                placeholder="描述这笔交易的买入逻辑..."
                rows={2}
                className="w-full bg-slate-700 text-white rounded px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* 预期 */}
            <div>
              <label className="block text-slate-400 text-sm mb-1">交易预期</label>
              <textarea
                value={form.expectation}
                onChange={(e) => setForm({ ...form, expectation: e.target.value })}
                placeholder="这笔交易的预期目标是什么？"
                rows={2}
                className="w-full bg-slate-700 text-white rounded px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* 当前走势 */}
            <div>
              <label className="block text-slate-400 text-sm mb-1">当前走势</label>
              <textarea
                value={form.current_trend}
                onChange={(e) => setForm({ ...form, current_trend: e.target.value })}
                placeholder="当前走势描述..."
                rows={2}
                className="w-full bg-slate-700 text-white rounded px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* 卖出价格（编辑时） */}
            {editingId && (
              <div>
                <label className="block text-slate-400 text-sm mb-1">卖出价格（标记完成时填写）</label>
                <input
                  type="number" step="0.01"
                  value={form.sell_price}
                  onChange={(e) => setForm({ ...form, sell_price: e.target.value })}
                  placeholder="如：13.50"
                  className="w-full bg-slate-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => { setShowForm(false); setEditingId(null); setForm({ ...EMPTY_FORM }) }}
              className="px-4 py-2 text-slate-400 hover:text-white"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg"
            >
              {editingId ? '保存修改' : '保存交易'}
            </button>
          </div>
        </div>
      )}

      {/* 进行中的交易 */}
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-white">
          进行中的交易
          {activeDecisions.length > 0 && (
            <span className="ml-2 text-sm font-normal text-slate-400">({activeDecisions.length}笔)</span>
          )}
        </h3>
      </div>

      {activeDecisions.length === 0 && (
        <div className="text-center text-slate-500 py-12 mb-8">
          <Target size={48} className="mx-auto mb-4 opacity-50" />
          <p>暂无进行中的交易</p>
        </div>
      )}

      <div className="space-y-4 mb-8">
        {activeDecisions.map((d) => (
          <TradeCard
            key={d.id}
            decision={d}
            totalCapital={totalCapital}
            expanded={expandedCards.has(d.id)}
            onToggle={() => toggleExpand(d.id)}
            onComplete={() => handleComplete(d)}
            onEdit={() => handleEdit(d)}
            onDelete={() => handleDelete(d.id)}
            pnlColor={pnlColor}
            formatDate={formatDate}
            onShowLogic={(title, content, field) => setLogicModal({ open: true, title, content, decisionId: d.id, field })}
          />
        ))}
      </div>

      {/* 已完成的交易 */}
      {completedDecisions.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-4"
          >
            <h3 className="text-lg font-semibold">
              已完成的交易
              <span className="ml-2 text-sm font-normal text-slate-500">({completedDecisions.length}笔)</span>
            </h3>
            {showCompleted ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {showCompleted && (
            <div className="space-y-4">
              {completedDecisions.map((d) => (
                <TradeCard
                  key={d.id}
                  decision={d}
                  totalCapital={totalCapital}
                  expanded={expandedCards.has(d.id)}
                  onToggle={() => toggleExpand(d.id)}
                  onEdit={() => handleEdit(d)}
                  onDelete={() => handleDelete(d.id)}
                  pnlColor={pnlColor}
                  formatDate={formatDate}
                  onShowLogic={(title, content, field) => setLogicModal({ open: true, title, content, decisionId: d.id, field })}
                  isCompleted
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  )
}

function CalcItem({ label, value }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-white font-medium">{value}</div>
    </div>
  )
}

function TradeCard({ decision: d, totalCapital, expanded, onToggle, onComplete, onEdit, onDelete, pnlColor, formatDate, onShowLogic, isCompleted }) {
  const buyAmount = (d.buy_price || 0) * (d.quantity || 0)
  const riskAmount = Math.max(0, ((d.buy_price || 0) - (d.stop_loss || 0)) * (d.quantity || 0))
  const riskPercent = totalCapital > 0 ? (riskAmount / totalCapital * 100).toFixed(2) : '0'
  const capitalPercent = totalCapital > 0 ? (buyAmount / totalCapital * 100).toFixed(1) : '0'
  const pnl = (d.final_pnl || 0)
  const pnlPercent = (d.final_pnl_percent || 0)
  const finalPnlColor = pnlColor(pnl)

  const marketLabel = MARKET_TYPE_OPTIONS.find(o => o.value === d.market_type)?.label || ''
  const modelLabel = TRADE_MODEL_OPTIONS.find(o => o.value === d.trade_model)?.label || ''
  const entryLabel = ENTRY_TYPE_OPTIONS.find(o => o.value === d.entry_type)?.label || ''

  return (
    <div className={`bg-slate-800 rounded-lg border transition-colors ${isCompleted ? 'border-slate-700 opacity-80' : 'border-slate-700 hover:border-indigo-500'}`}>
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white text-lg">{d.stock_name}</h3>
                {isCompleted ? (
                  <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded">已完成</span>
                ) : (
                  <span className="text-xs bg-indigo-600/30 text-indigo-300 px-2 py-0.5 rounded">进行中</span>
                )}
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <Clock size={11} />
                {formatDate(d.created_at)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 盈亏标签 */}
            {isCompleted && (
              <div className={`text-right ${finalPnlColor}`}>
                <div className="text-sm font-bold">{pnl >= 0 ? '+' : ''}¥{pnl.toFixed(0)}</div>
                <div className="text-xs">{pnlPercent >= 0 ? '+' : ''}{pnlPercent}%</div>
              </div>
            )}
            {!isCompleted && (
              <div className="text-right">
                <div className="text-sm text-white font-medium">¥{buyAmount.toFixed(0)}</div>
                <div className="text-xs text-slate-500">买入金额</div>
              </div>
            )}
            <button onClick={onToggle} className="p-1 text-slate-500 hover:text-white">
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {/* 核心指标行 */}
        <div className="grid grid-cols-4 gap-3 mb-3">
          <MiniStat label="买入价" value={`¥${d.buy_price || '—'}`} />
          <MiniStat label="数量" value={`${d.quantity || '—'}股`} />
          <MiniStat label="止损" value={d.stop_loss ? `¥${d.stop_loss}` : '—'} red />
          <MiniStat
            label="单笔风险"
            value={d.buy_price && d.quantity ? `${riskPercent}%` : '—'}
            red
          />
        </div>

        {/* Tags row */}
        {(marketLabel || modelLabel || entryLabel) && (
          <div className="flex flex-wrap gap-2 mb-3">
            {marketLabel && <Tag color="blue">{marketLabel}</Tag>}
            {modelLabel && <Tag color="purple">{modelLabel}</Tag>}
            {entryLabel && <Tag color={entryLabel.includes('高位') ? 'orange' : 'green'}>{entryLabel}</Tag>}
          </div>
        )}

        {/* 买入逻辑 & 预期 & 当前走势按钮（始终显示） */}
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={() => onShowLogic('买入逻辑', d.entry_logic, 'entry_logic')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-sm transition-colors"
          >
            <FileText size={13} />
            买入逻辑
            {!d.entry_logic && <span className="text-slate-600 ml-1">未填写</span>}
          </button>
          <button
            onClick={() => onShowLogic('交易预期', d.expectation, 'expectation')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-sm transition-colors"
          >
            <Lightbulb size={13} />
            交易预期
            {!d.expectation && <span className="text-slate-600 ml-1">未填写</span>}
          </button>
          <button
            onClick={() => onShowLogic('当前走势', d.current_trend, 'current_trend')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-sm transition-colors"
          >
            <TrendingUp size={13} />
            当前走势
            {!d.current_trend && <span className="text-slate-600 ml-1">未填写</span>}
          </button>
        </div>

        {/* 展开详情 */}
        {expanded && (
          <div className="border-t border-slate-700 pt-4 mt-2 space-y-4">
            {/* 完整计算 */}
            <div className="bg-slate-700/40 rounded p-3">
              <div className="text-xs text-slate-500 mb-2">风险计算</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <CalcItem label="买入金额" value={`¥${buyAmount.toFixed(2)}`} />
                <CalcItem label="单笔风险金额" value={`¥${riskAmount.toFixed(2)}`} />
                <CalcItem label="单笔风险比例" value={`${riskPercent}%`} />
                <CalcItem label="占总资金" value={`${capitalPercent}%`} />
              </div>
            </div>

            {/* 完成后结果显示 */}
            {isCompleted && d.sell_price && (
              <div className="bg-slate-700/40 rounded p-3">
                <div className="text-xs text-slate-500 mb-2">最终结果</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <CalcItem label="卖出价格" value={`¥${d.sell_price}`} />
                  <CalcItem label="盈亏金额" value={`${pnl >= 0 ? '+' : ''}¥${pnl.toFixed(2)}`} />
                  <CalcItem label="盈亏比例" value={`${pnlPercent >= 0 ? '+' : ''}${pnlPercent}%`} />
                </div>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-2 pt-2">
              {!isCompleted && (
                <button
                  onClick={onComplete}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/20 text-green-400 rounded hover:bg-green-600/30 text-sm transition-colors"
                >
                  <Check size={14} />
                  标记完成
                </button>
              )}
              <button
                onClick={onEdit}
                className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 text-sm transition-colors"
              >
                编辑
              </button>
              <button
                onClick={onDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 text-red-400 hover:bg-red-400/10 rounded text-sm transition-colors"
              >
                <Trash2 size={14} />
                删除
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MiniStat({ label, value, red }) {
  return (
    <div className="bg-slate-700/30 rounded px-3 py-2">
      <div className="text-xs text-slate-500 mb-0.5">{label}</div>
      <div className={`text-sm font-medium ${red ? 'text-red-400' : 'text-white'}`}>{value}</div>
    </div>
  )
}

function Tag({ children, color }) {
  const colors = {
    blue: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    purple: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
    orange: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
    green: 'bg-green-500/20 text-green-300 border border-green-500/30',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded ${colors[color] || colors.blue}`}>
      {children}
    </span>
  )
}
