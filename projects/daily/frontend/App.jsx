import { useState, useEffect, useRef } from 'react'
import {
  ArrowLeft, Calendar, Inbox, Plus, Check, Trash2,
  Edit3, Save, X, ChevronRight, Zap, Target, FolderKanban, ListTodo, GripVertical,
  GitBranch, Clock
} from 'lucide-react'
import StarField from './components/StarField'

const ACCENT = '#6366f1'
const ACCENT_LIGHT = '#818cf8'

const API_BASE = '/daily/api'

// ─── 日期工具（使用本地时间，避免 UTC 时区问题）───
function toLocalDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ─── API 工具 ───
async function apiGet(path) {
  const res = await fetch(API_BASE + path)
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
  return res.json()
}

async function apiPost(path, data) {
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`)
  return res.json()
}

async function apiPut(path, data) {
  const res = await fetch(API_BASE + path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`)
  return res.json()
}

async function apiDelete(path) {
  const res = await fetch(API_BASE + path, { method: 'DELETE' })
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`)
  return res.json()
}

// ─── 项目卡片 ───
function ProjectCard({ project, onUpdate, onDelete, onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd, isDragging, isOver }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ problem: project.problem, plan: project.plan, target: project.target })
  const problemRef = useRef(null)
  const planRef = useRef(null)
  const targetRef = useRef(null)

  function autoResize(el) {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }

  function handleSave() {
    onUpdate(project.id, form)
    setEditing(false)
  }

  const isDraggingSelf = isDragging === project.id
    const isOverSelf = isOver === project.id
    return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart(project.id) }}
      onDragOver={e => onDragOver(e, project.id)}
      onDragLeave={onDragLeave}
      onDrop={e => onDrop(e, project.id)}
      onDragEnd={onDragEnd}
      className="rounded-xl p-5 transition-all duration-200 cursor-pointer relative group"
      style={{
        backgroundColor: editing ? '#F5EDE5' : isDraggingSelf ? '#FFE8CC' : isOverSelf ? '#FFE0C4' : '#FFF7F0',
        border: `1px solid ${isOverSelf ? 'rgba(200,130,60,0.5)' : 'rgba(180,120,80,0.15)'}`,
        opacity: isDraggingSelf ? 0.5 : 1,
        transform: isDraggingSelf ? 'scale(0.98)' : 'scale(1)',
      }}
      onMouseEnter={e => { if (!editing && !isDraggingSelf) e.currentTarget.style.backgroundColor = '#FFF0E3' }}
      onMouseLeave={e => { if (!editing && !isDraggingSelf) e.currentTarget.style.backgroundColor = '#FFF7F0' }}
    >
      {/* 顶栏 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <GripVertical size={14} className="flex-shrink-0 opacity-30 group-hover:opacity-70 transition-opacity cursor-grab" style={{color:'#C8742A'}} />
          <span className="text-xl">{project.emoji}</span>
          <span className="font-semibold text-[0.9375rem]" style={{color:'#3D2517'}}>{project.name}</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); editing ? handleSave() : setEditing(true) }}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: '#C8742A', backgroundColor: 'rgba(200,116,42,0.1)' }}
          >
            {editing ? <Save size={13} /> : <Edit3 size={13} />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(project.id) }}
            className="p-1.5 rounded-lg hover:text-red-400 transition-colors"
            style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* 内容 */}
      {editing ? (
        <div className="space-y-2.5 mt-2">
          {[
            { key: 'problem', label: '核心问题', placeholder: '当前最核心的问题是什么？', ref: problemRef },
            { key: 'plan', label: '行动计划', placeholder: '具体要做什么？', ref: planRef },
            { key: 'target', label: '目标', placeholder: '想要达成的结果？', ref: targetRef },
          ].map(field => (
            <div key={field.key}>
              <label className="text-[0.7rem] mb-1 block" style={{ color: '#7A5030' }}>{field.label}</label>
              <textarea
                ref={field.ref}
                value={form[field.key]}
                onChange={e => { setForm({ ...form, [field.key]: e.target.value }); autoResize(e.target) }}
                onInput={e => autoResize(e.target)}
                placeholder={field.placeholder}
                rows={1}
                className="w-full px-3 py-2 rounded-lg text-[0.8125rem] placeholder:text-[#BB8866] transition-colors focus:outline-none resize-none overflow-hidden"
                style={{ backgroundColor: '#FFF9F4', border: '1px solid rgba(180,120,80,0.2)', color:'#3D2517', minHeight: '38px', lineHeight: '1.5' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#C8742A'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(180,120,80,0.2)'}
              />
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <button onClick={() => { handleSave(); autoResize(problemRef.current); autoResize(planRef.current); autoResize(targetRef.current) }}
              className="flex-1 py-1.5 rounded-lg text-white text-[0.8125rem] font-medium transition-all" style={{ backgroundColor: ACCENT }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = ACCENT_LIGHT}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = ACCENT}>
              保存
            </button>
            <button onClick={() => { setEditing(false); setForm({ problem: project.problem, plan: project.plan, target: project.target }) }}
              className="px-4 py-1.5 rounded-lg text-[0.8125rem] transition-colors" style={{ backgroundColor: 'rgba(200,116,42,0.08)', color:'#7A5030' }}>
              取消
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {['problem', 'plan', 'target'].map(key => project[key] ? (
            <div key={key} className="flex items-start gap-2">
              <span className="text-[0.65rem] uppercase tracking-wider mt-0.5 flex-shrink-0" style={{ color: '#7A5030' }}>
                {key === 'problem' ? '问题' : key === 'plan' ? '计划' : '目标'}
              </span>
              <span className="text-[0.8125rem] leading-relaxed" style={{color:'#3D2517'}}>{project[key]}</span>
            </div>
          ) : null)}
          {!project.problem && !project.plan && !project.target && (
            <p className="text-[0.8rem] italic" style={{color:'#7A5030'}}>点击编辑，填写你的计划</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── 待办项 ───
function TodoItem({ todo, onToggle, onDelete, onMoveToday }) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl transition-all group"
      style={{ backgroundColor: '#FFFBF5', border: '1px solid rgba(180,120,80,0.2)' }}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FFF5EA'}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFBF5'}
    >
      <button
        onClick={() => onToggle(todo.id)}
        className="flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
        style={{
          borderColor: todo.done ? ACCENT : '#7A5030',
          backgroundColor: todo.done ? ACCENT : 'transparent',
        }}
      >
        {todo.done && <Check size={11} className="text-white" />}
      </button>
      <span
        className="flex-1 text-[0.875rem] leading-snug transition-all"
        style={{ color: todo.done ? '#7A5030' : '#3D2517', textDecoration: todo.done ? 'line-through' : 'none' }}
      >
        {todo.text}
      </span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {todo.deadline !== 'today' && (
          <button onClick={() => onMoveToday(todo.id)} className="p-1 transition-colors" style={{color:'#7A5030'}} title="移到今日"
            onMouseEnter={e=>e.currentTarget.style.color='#3D2517'}
            onMouseLeave={e=>e.currentTarget.style.color='#7A5030'}>
            <ChevronRight size={13} />
          </button>
        )}
        <button onClick={() => onDelete(todo.id)} className="p-1 transition-colors" style={{color:'#7A5030'}}
          onMouseEnter={e=>e.currentTarget.style.color='#DC2626'}
          onMouseLeave={e=>e.currentTarget.style.color='#7A5030'}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ─── 收集箱侧边栏 ───
function InboxSidebar({ open, onClose, todos, onAdd, onToggle, onMoveToday, onDelete, onOpenMatrix }) {
  const [newText, setNewText] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)

  const today = new Date()
  const todayStr = toLocalDateStr(today)

  // 未来7天快捷按钮数据
  const quickDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const dayNames = ['今天', '明天', '后天']
    const dow = d.getDay() // 0=Sun
    const label = i < 3 ? dayNames[i] : ['周日','周一','周二','周三','周四','周五','周六'][dow]
    return { label, date: toLocalDateStr(d), isToday: i === 0 }
  })

  // 今日待办：deadline = todayStr 或 'today'
  const todayItems = todos.filter(t => t.deadline === todayStr || t.deadline === 'today')
  // 收集箱：deadline = inbox（且无 today_badge）
  const inboxItems = todos.filter(t => t.deadline === 'inbox' && !t.today_badge)
  // 已排期（未来7天，非today）
  const scheduledItems = todos.filter(t => {
    if (t.deadline === todayStr || t.deadline === 'today' || t.deadline === 'inbox') return false
    return quickDays.some(d => d.date === t.deadline)
  })
  // 收集箱里带 today_badge 的项（显示在收集箱但带今天徽章）
  const inboxTodayItems = todos.filter(t => t.today_badge)

  function handleAdd(deadline) {
    if (!newText.trim()) return
    onAdd({ text: newText.trim(), deadline: deadline, priority: 'medium', done: false })
    setNewText('')
    setShowDatePicker(false)
  }

  function handleMoveToday(todo) {
    // 移到今天：更新现有任务 + 标记 today_badge（收集箱内显示今天徽章）
    onMoveToday(todo.id, { today_badge: true })
  }

  function ItemCard({ t, showDate, isInboxToday }) {
    const dateLabel = showDate && t.deadline !== todayStr
      ? quickDays.find(d => d.date === t.deadline)?.label || new Date(t.deadline).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
      : null

    return (
      <div className="flex items-start gap-2 p-2.5 rounded-xl"
        style={{ backgroundColor: '#FFFBF5', border: '1px solid rgba(180,120,80,0.12)' }}>
        <button
          onClick={() => onToggle(t.id)}
          className="flex-shrink-0 w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center transition-all"
          style={{ borderColor: t.done ? ACCENT : '#C8742A', backgroundColor: t.done ? ACCENT : 'transparent' }}
        >
          {t.done && <Check size={10} className="text-white" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-[0.8125rem] leading-snug" style={{ color: t.done ? '#B0A090' : '#3D2517', textDecoration: t.done ? 'line-through' : 'none' }}>
              {t.text}
            </p>
            {dateLabel && (
              <span className="text-[0.6rem] px-1.5 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: 'rgba(200,116,42,0.12)', color: '#C8742A' }}>
                {dateLabel}
              </span>
            )}
            {isInboxToday && (
              <span className="text-[0.6rem] px-1.5 py-0.5 rounded-full font-bold"
                style={{ backgroundColor: '#C8742A', color: '#fff' }}>
                今天
              </span>
            )}
          </div>
          {t.project && (
            <span className="inline-block mt-1 text-[0.65rem] px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: t.projectColor ? t.projectColor + '22' : 'rgba(99,102,241,0.1)', color: t.projectColor || ACCENT }}>
              {t.project}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-0.5 flex-shrink-0">
          <button
            onClick={() => handleMoveToday(t)}
            className="px-2 py-0.5 rounded text-[0.65rem] font-medium transition-all"
            style={{ color: '#6366f1', backgroundColor: 'rgba(99,102,241,0.08)' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#6366f1'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.08)'; e.currentTarget.style.color = '#6366f1' }}>
            → 今
          </button>
          <button
            onClick={() => onDelete(t.id)}
            className="px-2 py-0.5 rounded text-[0.65rem] font-medium transition-all"
            style={{ color: '#DC2626', backgroundColor: 'rgba(220,38,38,0.06)' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#DC2626'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(220,38,38,0.06)'; e.currentTarget.style.color = '#DC2626' }}>
            ×
          </button>
        </div>
      </div>
    )
  }

  // 今日待办紧凑行（金色主题，置顶用）
  function CompactItem({ t, onToggle, gold }) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl" style={{ backgroundColor: gold ? 'rgba(200,116,42,0.08)' : 'rgba(200,116,42,0.04)' }}>
        <button
          onClick={() => onToggle(t.id)}
          className="flex-shrink-0 w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all"
          style={{ borderColor: t.done ? ACCENT : '#C8742A', backgroundColor: t.done ? ACCENT : 'transparent' }}
        >
          {t.done && <Check size={8} className="text-white" />}
        </button>
        <p className="flex-1 text-[0.75rem] leading-snug truncate" style={{ color: t.done ? '#B0A090' : '#C8742A', textDecoration: t.done ? 'line-through' : 'none', fontWeight: gold ? 500 : 400 }}>
          {t.text}
        </p>
      </div>
    )
  }

  function SectionLabel({ emoji, label, count, orange }) {
    return (
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[0.75rem]">{emoji}</span>
        <span className="text-[0.75rem] font-semibold" style={{ color: orange ? '#C8742A' : '#7A5030' }}>{label}</span>
        {count > 0 && (
          <span className="text-[0.6rem] px-1.5 py-0.5 rounded-full font-bold"
            style={{ backgroundColor: orange ? 'rgba(200,116,42,0.18)' : 'rgba(180,120,80,0.15)', color: orange ? '#C8742A' : '#7A5030' }}>
            {count}
          </span>
        )}
      </div>
    )
  }

  const allCount = todayItems.length + inboxItems.length + scheduledItems.length + inboxTodayItems.length

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      )}
      <div
        className="fixed top-0 right-0 h-full w-80 z-50 flex flex-col transition-transform duration-300"
        style={{
          backgroundColor: '#FFF9F4',
          borderLeft: '1px solid rgba(180,120,80,0.2)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid rgba(180,120,80,0.2)' }}>
          <div className="flex items-center gap-2">
            <Inbox size={18} style={{ color: '#C8742A' }} />
            <span className="font-semibold text-[0.9375rem]" style={{ color: '#3D2517' }}>收集箱</span>
            {allCount > 0 && (
              <span className="text-[0.7rem] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(200,116,42,0.1)', color: '#C8742A' }}>
                {allCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={onOpenMatrix}
              className="px-2.5 py-1.5 rounded-lg text-[0.7rem] font-medium transition-all"
              style={{ backgroundColor: '#7C3AED', color: '#fff' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#6D28D9'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#7C3AED'}>
              四象限
            </button>
            <button onClick={onClose}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: '#7A5030', backgroundColor: 'rgba(200,116,42,0.08)' }}
              onMouseEnter={e => e.currentTarget.style.color = '#3D2517'}
              onMouseLeave={e => e.currentTarget.style.color = '#7A5030'}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* 快速添加区 */}
        <div className="p-3 space-y-2" style={{ borderBottom: '1px solid rgba(180,120,80,0.2)' }}>
          <textarea
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                if (newText.trim()) handleAdd('inbox')
              }
            }}
            placeholder="记下来... Enter 发到收集箱"
            rows={2}
            className="w-full px-3 py-2 rounded-xl text-[0.8125rem] resize-none focus:outline-none"
            style={{ backgroundColor: '#FFFBF5', border: '1px solid rgba(180,120,80,0.2)', color: '#3D2517' }}
          />

          {/* 7天快捷按钮 + 日期选择器 */}
          <div className="flex gap-1 items-center">
            {quickDays.map(({ label, date, isToday }) => (
              <button
                key={date}
                onClick={() => newText.trim() && handleAdd(date)}
                disabled={!newText.trim()}
                className="flex-1 py-1.5 rounded-lg text-[0.65rem] font-medium transition-all"
                style={{
                  backgroundColor: isToday ? 'rgba(200,116,42,0.14)' : 'rgba(180,120,80,0.06)',
                  border: isToday ? '1.5px solid #C8742A' : '1.5px solid transparent',
                  color: isToday ? '#C8742A' : '#7A5030',
                  fontWeight: isToday ? 600 : 400,
                  opacity: newText.trim() ? 1 : 0.4,
                  cursor: newText.trim() ? 'pointer' : 'not-allowed',
                }}>
                {label}
              </button>
            ))}
            {/* 自由日期选择按钮 */}
            <button
              onClick={() => setShowDatePicker(v => !v)}
              className="flex-shrink-0 px-2 py-1.5 rounded-lg text-[0.65rem] font-medium transition-all"
              style={{
                backgroundColor: showDatePicker ? '#C8742A' : 'rgba(180,120,80,0.08)',
                color: showDatePicker ? '#fff' : '#7A5030',
                border: '1.5px solid ' + (showDatePicker ? '#C8742A' : 'rgba(180,120,80,0.2)'),
              }}>
              📅
            </button>
          </div>

          {/* 日期选择器 */}
          {showDatePicker && (
            <div className="flex gap-2 items-center">
              <input
                type="date"
                id="free-date"
                className="flex-1 px-2.5 py-1.5 rounded-lg text-[0.75rem] focus:outline-none"
                style={{ backgroundColor: '#FFFBF5', border: '1px solid rgba(180,120,80,0.25)', color: '#3D2517', colorScheme: 'light' }}
              />
              <button
                onClick={() => {
                  const dateVal = document.getElementById('free-date').value
                  if (dateVal && newText.trim()) handleAdd(dateVal)
                }}
                disabled={!newText.trim()}
                className="px-3 py-1.5 rounded-lg text-[0.75rem] font-medium text-white transition-all"
                style={{ backgroundColor: newText.trim() ? ACCENT : '#ccc', cursor: newText.trim() ? 'pointer' : 'not-allowed' }}>
                添加
              </button>
            </div>
          )}

          <div className="text-[0.6rem] text-center" style={{ color: '#B0A090' }}>
            输入内容后点击日期分配，或直接 Enter 发到收集箱
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* 今日待办（置顶，金色文字，紧凑行） */}
          {todayItems.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[0.75rem]">📌</span>
                <span className="text-[0.75rem] font-semibold" style={{ color: '#C8742A' }}>今日待办</span>
                <span className="text-[0.6rem] px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: 'rgba(200,116,42,0.15)', color: '#C8742A' }}>
                  {todayItems.filter(t => !t.done).length} 待办
                </span>
              </div>
              <div className="space-y-1">
                {todayItems.map(t => <CompactItem key={t.id} t={t} onToggle={onToggle} gold={true} />)}
              </div>
            </div>
          )}

          {/* 收集箱（deadline=inbox） */}
          <div>
            <SectionLabel emoji="📥" label="收集箱" count={inboxItems.length + inboxTodayItems.length} orange={false} />

            {/* 收集箱内带 today_badge 的任务（置顶，带今天徽章） */}
            {inboxTodayItems.length > 0 && (
              <div className="mb-2">
                {inboxTodayItems.map(t => (
                  <ItemCard key={t.id} t={t} showDate={false} isInboxToday={true} />
                ))}
              </div>
            )}

            {inboxItems.length === 0 && scheduledItems.length === 0 && todayItems.length === 0 && inboxTodayItems.length === 0 ? (
              <div className="text-center py-8 rounded-xl" style={{ backgroundColor: 'rgba(200,116,42,0.04)', border: '1px dashed rgba(200,116,42,0.18)' }}>
                <Inbox size={22} style={{ color: '#D4C4B0', margin: '0 auto 6px' }} />
                <div className="text-[0.75rem]" style={{ color: '#C4B4A0' }}>空空的</div>
                <div className="text-[0.65rem] mt-0.5" style={{ color: '#D4C4B0' }}>记下来，然后分配日期</div>
              </div>
            ) : inboxItems.length === 0 ? null : (
              <div className="space-y-1.5">
                {inboxItems.map(t => <ItemCard key={t.id} t={t} showDate={false} isInboxToday={false} />)}
              </div>
            )}
          </div>

          {/* 已排期（未来7天内，非today） */}
          {scheduledItems.length > 0 && (
            <div>
              <SectionLabel emoji="📆" label={`近期 ${scheduledItems.length}`} count={scheduledItems.length} orange={false} />
              <div className="space-y-1.5">
                {scheduledItems.map(t => <ItemCard key={t.id} t={t} showDate={true} isInboxToday={false} />)}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─── 四象限视图 ───
function InboxMatrixView({ inboxTodos, matrixTags, onToggle, onMoveToday, onDelete, toggleTag }) {
  const q1 = inboxTodos.filter(t => matrixTags[t.id]?.important && matrixTags[t.id]?.urgent)
  const q2 = inboxTodos.filter(t => matrixTags[t.id]?.important && !matrixTags[t.id]?.urgent)
  const q3 = inboxTodos.filter(t => !matrixTags[t.id]?.important && matrixTags[t.id]?.urgent)
  const q4 = inboxTodos.filter(t => !matrixTags[t.id]?.important && !matrixTags[t.id]?.urgent)

  const quadrants = [
    { items: q1, label: '重要且紧急', color: '#DC2626', bg: 'rgba(220,38,38,0.06)', border: 'rgba(220,38,38,0.2)' },
    { items: q2, label: '重要不紧急', color: '#7C3AED', bg: 'rgba(124,58,237,0.06)', border: 'rgba(124,58,237,0.2)' },
    { items: q3, label: '紧急不重要', color: '#D97706', bg: 'rgba(217,119,6,0.06)', border: 'rgba(217,119,6,0.2)' },
    { items: q4, label: '既不重要也不紧急', color: '#9CA3AF', bg: 'rgba(156,163,175,0.06)', border: 'rgba(156,163,175,0.15)' },
  ]

  function ItemChip({ t }) {
    const imp = matrixTags[t.id]?.important
    const urg = matrixTags[t.id]?.urgent
    return (
      <div className="p-2 rounded-lg" style={{ backgroundColor: '#FFFBF5', border: '1px solid rgba(0,0,0,0.06)' }}>
        <p className="text-[0.8rem] leading-snug mb-2" style={{ color: '#3D2517' }}>{t.text}</p>
        <div className="flex items-center gap-1 flex-wrap">
          <button onClick={() => toggleTag(t.id, 'important')}
            className="text-[0.65rem] px-2 py-0.5 rounded-full font-medium transition-all"
            style={{ backgroundColor: imp ? '#7C3AED' : 'rgba(124,58,237,0.1)', color: imp ? '#fff' : '#7C3AED' }}>
            ★ 重要
          </button>
          <button onClick={() => toggleTag(t.id, 'urgent')}
            className="text-[0.65rem] px-2 py-0.5 rounded-full font-medium transition-all"
            style={{ backgroundColor: urg ? '#DC2626' : 'rgba(220,38,38,0.1)', color: urg ? '#fff' : '#DC2626' }}>
            ⚡ 紧急
          </button>
          <button onClick={() => onMoveToday(t.id)} className="ml-auto text-[0.65rem] px-2 py-0.5 rounded-full" style={{ color: '#6366f1', backgroundColor: 'rgba(99,102,241,0.08)' }}>→今</button>
          <button onClick={() => onDelete(t.id)} className="text-[0.65rem] px-2 py-0.5 rounded-full" style={{ color: '#DC2626', backgroundColor: 'rgba(220,38,38,0.06)' }}>×</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* 列标签 */}
      <div className="flex mb-2 pl-16">
        <span className="flex-1 text-center text-[0.65rem] font-semibold" style={{color:'#DC2626'}}>⚡ 紧急</span>
        <span className="flex-1 text-center text-[0.65rem] font-semibold" style={{color:'#9CA3AF'}}>☁️ 不急</span>
      </div>
      <div className="flex gap-2 flex-1 min-h-0">
        {/* 左列：重要 */}
        <div className="flex-1 flex flex-col gap-2 min-h-0">
          {quadrants.slice(0, 2).map(q => (
            <div key={q.label} className="flex-1 rounded-xl p-2.5 flex flex-col min-h-0" style={{ backgroundColor: q.bg, border: '1px solid ' + q.border }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[0.7rem] font-semibold" style={{color: q.color}}>{q.label}</span>
                <span className="text-[0.6rem] px-1.5 py-0.5 rounded-full font-bold" style={{color:'#fff', backgroundColor: q.color}}>{q.items.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1.5">
                {q.items.length === 0 && <p className="text-[0.65rem] text-center py-2" style={{color:'#ccc'}}>—</p>}
                {q.items.map(t => <ItemChip key={t.id} t={t} />)}
              </div>
            </div>
          ))}
        </div>
        {/* 右列：不重要 */}
        <div className="flex-1 flex flex-col gap-2 min-h-0">
          {quadrants.slice(2, 4).map(q => (
            <div key={q.label} className="flex-1 rounded-xl p-2.5 flex flex-col min-h-0" style={{ backgroundColor: q.bg, border: '1px solid ' + q.border }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[0.7rem] font-semibold" style={{color: q.color}}>{q.label}</span>
                <span className="text-[0.6rem] px-1.5 py-0.5 rounded-full font-bold" style={{color:'#fff', backgroundColor: q.color}}>{q.items.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1.5">
                {q.items.length === 0 && <p className="text-[0.65rem] text-center py-2" style={{color:'#ccc'}}>—</p>}
                {q.items.map(t => <ItemChip key={t.id} t={t} />)}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* 行标签 */}
      <div className="flex mt-2 pl-16">
        <span className="flex-1 text-center text-[0.65rem] font-semibold" style={{color:'#7C3AED'}}>★ 重要</span>
        <span className="flex-1 text-center text-[0.65rem] font-semibold" style={{color:'#9CA3AF'}}>○ 不重要</span>
      </div>
      {/* 快捷标记 */}
      {inboxTodos.length > 0 && (
        <div className="flex gap-2 mt-2">
          <button onClick={() => inboxTodos.forEach(t => !matrixTags[t.id]?.important && toggleTag(t.id,'important'))}
            className="text-[0.7rem] px-3 py-1 rounded-full font-medium" style={{backgroundColor:'rgba(124,58,237,0.1)',color:'#7C3AED'}}>
            全部标★重要
          </button>
          <button onClick={() => inboxTodos.forEach(t => !matrixTags[t.id]?.urgent && toggleTag(t.id,'urgent'))}
            className="text-[0.7rem] px-3 py-1 rounded-full font-medium" style={{backgroundColor:'rgba(220,38,38,0.1)',color:'#DC2626'}}>
            全部标⚡紧急
          </button>
        </div>
      )}
    </div>
  )
}

// ─── 四象限弹窗 ───
function MatrixModal({ open, onClose, todos, matrixTags, setMatrixTags, onToggle, onMoveToday, onDelete }) {
  const inboxTodos = todos.filter(t => t.deadline === 'inbox')

  function toggleTag(id, type) {
    setMatrixTags(prev => ({ ...prev, [id]: { ...prev[id], [type]: !prev[id]?.[type] } }))
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-[92vw] max-w-4xl h-[80vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl"
        style={{ backgroundColor: '#FFF9F4', border: '1px solid rgba(180,120,80,0.2)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 弹窗标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(180,120,80,0.2)' }}>
          <div className="flex items-center gap-3">
            <span className="text-[1rem] font-bold" style={{color:'#3D2517'}}>收集箱 · 四象限</span>
            <span className="text-[0.75rem] px-2 py-0.5 rounded-full" style={{color:'#7A5030',backgroundColor:'rgba(180,120,80,0.1)'}}>{inboxTodos.length} 条</span>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl transition-colors" style={{ color: '#7A5030', backgroundColor: 'rgba(180,120,80,0.1)' }}
            onMouseEnter={e=>{e.currentTarget.style.color='#fff';e.currentTarget.style.backgroundColor='#7C3AED'}}
            onMouseLeave={e=>{e.currentTarget.style.color='#7A5030';e.currentTarget.style.backgroundColor='rgba(180,120,80,0.1)'}}>
            <X size={18} />
          </button>
        </div>
        {/* 四象限内容 */}
        <div className="flex-1 p-4 min-h-0">
          <InboxMatrixView
            inboxTodos={inboxTodos}
            matrixTags={matrixTags}
            onToggle={onToggle}
            onMoveToday={onMoveToday}
            onDelete={onDelete}
            toggleTag={toggleTag}
          />
        </div>
      </div>
    </div>
  )
}

// ─── 复盘侧边栏 ───
function ReviewSidebar({ open, onClose }) {
  const todayStr = toLocalDateStr(new Date())
  const [reviewDate, setReviewDate] = useState(todayStr)
  const [content, setContent] = useState('')
  const [tomorrowPlan, setTomorrowPlan] = useState('')
  const [mood, setMood] = useState(7)
  const [energy, setEnergy] = useState(7)
  const [tags, setTags] = useState([])
  const [tagInput, setTagInput] = useState('')
  const [recordDates, setRecordDates] = useState([])
  const [analysis, setAnalysis] = useState(null)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)

  // Auto-resize textarea
  const contentRef = useRef(null)
  const planRef = useRef(null)

  function autoResize(el) {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }

  useEffect(() => { autoResize(contentRef.current) }, [content])
  useEffect(() => { autoResize(planRef.current) }, [tomorrowPlan])

  function moodColor(v) {
    if (v <= 3) return '#E53E3E'
    if (v <= 6) return '#DD6B20'
    return '#38A169'
  }
  function energyColor(v) {
    if (v <= 3) return '#E53E3E'
    if (v <= 6) return '#DD6B20'
    return '#38A169'
  }
  function moodLabel(v) {
    if (v <= 2) return '很低落 😔'
    if (v <= 4) return '有些低落 😕'
    if (v <= 6) return '一般 😐'
    if (v <= 8) return '不错 🙂'
    return '很棒！😄'
  }
  function energyLabel(v) {
    if (v <= 2) return '完全没劲 😴'
    if (v <= 4) return '比较疲惫 🥱'
    if (v <= 6) return '正常水平 💪'
    if (v <= 8) return '精力充沛 ⚡'
    return '超级有劲！🚀'
  }

  const suggestTags = ['学习', '工作', '运动', '休息', '社交', '创作', '阅读', '健康']

  async function loadData(ds) {
    try {
      const [reviewData, datesData, analysisData] = await Promise.all([
        apiGet(`/reviews/${ds}`),
        apiGet('/reviews'),
        apiGet('/reviews/analysis?days=7'),
      ])
      setContent(reviewData.content || '')
      setTomorrowPlan(reviewData.tomorrow_plan || '')
      setMood(reviewData.mood * 1 || 7)
      setEnergy(reviewData.energy * 1 || 7)
      setTags(Array.isArray(reviewData.tags) ? reviewData.tags : [])
      setRecordDates(datesData)
      setAnalysis(analysisData)
    } catch (e) { console.error(e) }
  }

  // 用 ref 保存最新 reviewDate，避免闭包捕获旧值导致数据写入错误日期
  const reviewDateRef = useRef(reviewDate)
  useEffect(() => { reviewDateRef.current = reviewDate }, [reviewDate])

  useEffect(() => {
    if (open) loadData(reviewDate)
  }, [open, reviewDate])

  async function handleSave(silent = false) {
    if (!silent) setSaving(true)
    try {
      // 使用 ref 获取最新的 reviewDate，避免闭包问题
      await apiPut(`/reviews/${reviewDateRef.current}`, { content, tomorrow_plan: tomorrowPlan, mood, energy, tags })
      await loadData(reviewDateRef.current)
      if (!silent) alert('复盘已保存 ✓')
      setLastSaved(new Date())
    } catch (e) { console.error(e) } finally { if (!silent) setSaving(false) }
  }

  // Auto-save on change (debounced 1.5s)
  useEffect(() => {
    if (!reviewDate) return
    const timer = setTimeout(() => {
      handleSave(true)
    }, 1500)
    return () => clearTimeout(timer)
  }, [content, tomorrowPlan, mood, energy, tags, reviewDate])

  function addTag(t) {
    if (t && !tags.includes(t)) setTags([...tags, t])
  }

  function shiftDate(ds, delta) {
    const d = new Date(ds)
    d.setDate(d.getDate() + delta)
    return toLocalDateStr(d)
  }

  function getCalendarDays(ds) {
    const days = []
    const d = new Date(ds)
    d.setDate(1)
    let startDow = (d.getDay() + 6) % 7
    for (let i = 0; i < startDow; i++) days.push({ day: '', date: '', isFuture: false })
    const y = d.getFullYear(), m = d.getMonth()
    const today = new Date()
    const todayStr2 = toLocalDateStr(today)
    let cur = new Date(d)
    while (cur.getMonth() === m) {
      const ds2 = toLocalDateStr(cur)
      days.push({ day: cur.getDate(), date: ds2, isFuture: ds2 > todayStr2 })
      cur.setDate(cur.getDate() + 1)
    }
    return days
  }

  const dateLabel = reviewDate === todayStr
    ? `今天 · ${new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}`
    : `${new Date(reviewDate).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}`

  const monthLabel = new Date(reviewDate).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      )}
      <div
        className="fixed top-0 right-0 h-full w-[420px] z-50 flex flex-col transition-transform duration-300"
        style={{
          backgroundColor: '#FFF9F4',
          borderLeft: '1px solid rgba(180,120,80,0.2)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 p-4" style={{ borderBottom: '1px solid rgba(180,120,80,0.2)' }}>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: '#7A5030', backgroundColor: 'rgba(200,116,42,0.08)' }}>
            <X size={16} />
          </button>
          <span className="font-semibold text-[0.9375rem]" style={{ color: '#3D2517' }}>📓 每日复盘</span>
          <div className="flex items-center gap-1" style={{ marginLeft: 'auto' }}>
            <button onClick={() => setReviewDate(shiftDate(reviewDate, -1))}
              className="px-2 py-1 rounded-lg text-[0.7rem]" style={{ border: '1px solid rgba(180,120,80,0.2)', color: '#7A5030' }}>◀</button>
            <button onClick={() => setReviewDate(todayStr)}
              className="px-2 py-1 rounded-lg text-[0.7rem]" style={{ border: '1px solid rgba(180,120,80,0.2)', color: '#7A5030' }}>今天</button>
            <button onClick={() => setReviewDate(shiftDate(reviewDate, 1))}
              className="px-2 py-1 rounded-lg text-[0.7rem]" style={{ border: '1px solid rgba(180,120,80,0.2)', color: '#7A5030' }}>▶</button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">

          {/* Date label */}
          <div className="text-center text-[0.8rem]" style={{ color: '#7A5030', fontWeight: 500 }}>📅 {dateLabel}</div>

          {/* Calendar */}
          <div>
            <div className="text-[0.7rem] font-semibold uppercase tracking-wide mb-2" style={{ color: '#7A5030' }}>
              📅 {monthLabel}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {['一', '二', '三', '四', '五', '六', '日'].map(d => (
                <div key={d} className="text-center text-[0.65rem] font-semibold" style={{ color: '#7A5030', padding: '4px 0' }}>{d}</div>
              ))}
              {getCalendarDays(reviewDate).map((day, idx) => (
                <div key={idx}
                  className="aspect-square rounded-lg text-[0.75rem] text-center leading-7 cursor-pointer transition-all"
                  style={{
                    backgroundColor: day.date === reviewDate ? ACCENT : day.date === todayStr ? 'rgba(200,116,42,0.15)' : recordDates.includes(day.date) ? 'rgba(200,116,42,0.1)' : day.isFuture ? 'transparent' : '#FFFBF5',
                    color: day.date === reviewDate ? '#fff' : day.date === todayStr ? ACCENT : '#3D2517',
                    fontWeight: day.date === todayStr || recordDates.includes(day.date) ? 600 : 400,
                    cursor: day.isFuture || !day.day ? 'default' : 'pointer',
                    opacity: day.isFuture && day.day ? 0.35 : 1,
                  }}
                  onClick={() => !day.isFuture && day.day && setReviewDate(day.date)}
                >
                  {day.day || ''}
                </div>
              ))}
            </div>
          </div>

          {/* 今日总结 */}
          <div>
            <div className="text-[0.7rem] font-semibold uppercase tracking-wide mb-2" style={{ color: '#7A5030' }}>📝 今日总结</div>
            <textarea
              ref={contentRef}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="今天做了什么？有哪些收获？"
              rows={1}
              className="w-full px-3 py-2 rounded-xl text-[0.875rem] focus:outline-none overflow-hidden"
              style={{ backgroundColor: '#FFFBF5', border: '1px solid rgba(180,120,80,0.2)', color: '#3D2517', minHeight: '60px', resize: 'none' }}
            />
          </div>

          {/* 明日计划 */}
          <div>
            <div className="text-[0.7rem] font-semibold uppercase tracking-wide mb-2" style={{ color: '#7A5030' }}>🚀 明日计划</div>
            <textarea
              ref={planRef}
              value={tomorrowPlan}
              onChange={e => setTomorrowPlan(e.target.value)}
              placeholder="明天要做什么？"
              rows={1}
              className="w-full px-3 py-2 rounded-xl text-[0.875rem] focus:outline-none overflow-hidden"
              style={{ backgroundColor: '#FFFBF5', border: '1px solid rgba(180,120,80,0.2)', color: '#3D2517', minHeight: '44px', resize: 'none' }}
            />
          </div>

          {/* 心情评分 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[0.7rem] font-semibold uppercase tracking-wide" style={{ color: '#7A5030' }}>😊 心情</span>
              <span className="text-[0.875rem] font-bold" style={{ color: ACCENT }}>{mood}/10</span>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <button key={n}
                  onClick={() => setMood(n)}
                  className="flex-1 aspect-square rounded-lg text-[0.75rem] font-medium transition-all"
                  style={{
                    backgroundColor: mood >= n ? moodColor(mood) : '#FFFBF5',
                    border: '1.5px solid ' + (mood >= n ? moodColor(mood) : 'rgba(180,120,80,0.2)'),
                    color: mood >= n ? '#fff' : '#7A5030',
                  }}
                >{n}</button>
              ))}
            </div>
            <div className="text-[0.65rem] mt-1" style={{ color: '#7A5030' }}>{moodLabel(mood)}</div>
          </div>

          {/* 精力评分 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[0.7rem] font-semibold uppercase tracking-wide" style={{ color: '#7A5030' }}>⚡ 精力</span>
              <span className="text-[0.875rem] font-bold" style={{ color: ACCENT }}>{energy}/10</span>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <button key={n}
                  onClick={() => setEnergy(n)}
                  className="flex-1 aspect-square rounded-lg text-[0.75rem] font-medium transition-all"
                  style={{
                    backgroundColor: energy >= n ? energyColor(energy) : '#FFFBF5',
                    border: '1.5px solid ' + (energy >= n ? energyColor(energy) : 'rgba(180,120,80,0.2)'),
                    color: energy >= n ? '#fff' : '#7A5030',
                  }}
                >{n}</button>
              ))}
            </div>
            <div className="text-[0.65rem] mt-1" style={{ color: '#7A5030' }}>{energyLabel(energy)}</div>
          </div>

          {/* 标签 */}
          <div>
            <div className="text-[0.7rem] font-semibold uppercase tracking-wide mb-2" style={{ color: '#7A5030' }}>🏷️ 标签</div>
            <div
              className="flex flex-wrap gap-1.5 p-2.5 rounded-xl"
              style={{ backgroundColor: '#FFFBF5', border: '1px solid rgba(180,120,80,0.2)', minHeight: '44px' }}
            >
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.75rem] font-medium"
                  style={{ backgroundColor: 'rgba(200,116,42,0.15)', color: ACCENT }}>
                  {tag}
                  <button onClick={() => setTags(tags.filter(t => t !== tag))}
                    className="ml-0.5 opacity-60 hover:opacity-100">×</button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                    e.preventDefault()
                    addTag(tagInput.trim().replace(/,/g, ''))
                    setTagInput('')
                  }
                  if (e.key === 'Backspace' && !tagInput && tags.length) {
                    setTags(tags.slice(0, -1))
                  }
                }}
                placeholder="输入标签，回车添加..."
                className="flex-1 min-w-[80px] bg-transparent outline-none text-[0.8125rem]"
                style={{ color: '#3D2517' }}
              />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {suggestTags.filter(t => !tags.includes(t)).map(t => (
                <button key={t} onClick={() => addTag(t)}
                  className="px-2.5 py-0.5 rounded-full text-[0.7rem]"
                  style={{ border: '1px solid rgba(180,120,80,0.2)', color: '#7A5030' }}>
                  + {t}
                </button>
              ))}
            </div>
          </div>

          {/* 分析卡片 */}
          {analysis && (
            <div className="rounded-xl p-4" style={{ backgroundColor: '#FFFBF5', border: '1px solid rgba(180,120,80,0.2)' }}>
              <div className="text-[0.8rem] font-semibold mb-3" style={{ color: ACCENT }}>📊 本周进展</div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="text-center p-2.5 rounded-lg" style={{ backgroundColor: '#FFF9F4' }}>
                  <div className="text-[1.4rem] font-bold" style={{ color: ACCENT }}>{analysis.total_reviews}</div>
                  <div className="text-[0.7rem]" style={{ color: '#7A5030' }}>复盘次数</div>
                </div>
                <div className="text-center p-2.5 rounded-lg" style={{ backgroundColor: '#FFF9F4' }}>
                  <div className="text-[1.4rem] font-bold" style={{ color: ACCENT }}>{analysis.avg_mood > 0 ? analysis.avg_mood.toFixed(1) : '-'}</div>
                  <div className="text-[0.7rem]" style={{ color: '#7A5030' }}>平均心情</div>
                </div>
              </div>
              <div className="text-center text-[0.8rem] p-2 rounded-lg" style={{ backgroundColor: '#FFF5EA', color: '#7A5030' }}>
                {analysis.message}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─── 工作流卡片 ───
function WorkflowCard({ workflow, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [lines, setLines] = useState(workflow?.steps || [])
  const inputRefs = useRef([])

  // 当 workflow prop 更新时同步 lines（保存后触发）
  useEffect(() => {
    if (!editing) {
      setLines(workflow?.steps || [])
    }
  }, [workflow])

  function focusInput(idx) {
    setTimeout(() => {
      const el = inputRefs.current[idx]
      if (el) {
        el.focus()
        // 光标移到末尾
        el.selectionStart = el.selectionEnd = el.value.length
      }
    }, 0)
  }

  function autoResize(el) {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }

  function handleSave() {
    onUpdate({ ...workflow, steps: lines.filter(l => l.trim()) })
    setEditing(false)
  }

  function handleKeyDown(e, idx) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const newLines = [...lines]
      newLines.splice(idx + 1, 0, '')
      setLines(newLines)
      // 等 DOM 更新后聚焦新行
      setTimeout(() => focusInput(idx + 1), 0)
    }
    if (e.key === 'Backspace' && lines[idx] === '' && lines.length > 1) {
      e.preventDefault()
      const newLines = lines.filter((_, i) => i !== idx)
      setLines(newLines)
      focusInput(Math.max(0, idx - 1))
    }
  }

  return (
    <div className="rounded-xl p-6" style={{ backgroundColor: '#FFF9F4', border: '1px solid rgba(180,120,80,0.2)' }}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <GitBranch size={17} style={{ color: '#C8742A' }} />
          <h2 className="font-semibold text-[0.9375rem]" style={{color:'#3D2517'}}>工作流</h2>
        </div>
        <button
          onClick={() => {
            if (editing) {
              handleSave()
            } else {
              if (lines.length === 0) setLines([''])
              setEditing(true)
              setTimeout(() => focusInput(0), 0)
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.8125rem] font-medium transition-all"
          style={{
            color: editing ? '#fff' : '#C8742A',
            backgroundColor: editing ? ACCENT : 'rgba(200,116,42,0.1)',
          }}
          onMouseEnter={e => { if (!editing) e.currentTarget.style.backgroundColor = 'rgba(200,116,42,0.2)' }}
          onMouseLeave={e => { if (!editing) e.currentTarget.style.backgroundColor = 'rgba(200,116,42,0.1)' }}
        >
          {editing ? <><Save size={13} /> 保存</> : <><Edit3 size={13} /> 编辑</>}
        </button>
      </div>

      {editing ? (
        <div className="space-y-2">
          <p className="text-[0.75rem] mb-2" style={{color:'#7A5030'}}>每行一个步骤，Enter 新增行，Backspace 删除空行</p>
          {lines.map((line, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-[0.75rem] mt-2 flex-shrink-0 leading-5" style={{color:'#C8742A'}}>{idx + 1}.</span>
              <textarea
                ref={el => { inputRefs.current[idx] = el; if (el) autoResize(el) }}
                value={line}
                onChange={e => {
                  const newLines = [...lines]
                  newLines[idx] = e.target.value
                  setLines(newLines)
                  autoResize(e.target)
                }}
                onKeyDown={e => handleKeyDown(e, idx)}
                rows={1}
                className="flex-1 px-3 py-2 rounded-lg text-[0.8125rem] focus:outline-none resize-none overflow-hidden"
                style={{ backgroundColor: '#FFFBF5', border: '1px solid rgba(180,120,80,0.2)', color:'#3D2517', minHeight: '38px', lineHeight: '1.5' }}
                placeholder={"步骤 " + (idx + 1)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {lines.length === 0 && (
            <p className="text-[0.8125rem] italic text-center py-4" style={{color:'#7A5030'}}>
              点击「编辑」记录每日工作流程
            </p>
          )}
          {lines.map((line, idx) => (
            <div key={idx} className="flex items-start gap-2.5 p-2 rounded-lg" style={{ backgroundColor: '#FFFBF5' }}>
              <span className="flex-shrink-0 w-5 h-5 rounded-full text-[0.65rem] font-bold flex items-center justify-center mt-0.5" style={{ backgroundColor: ACCENT, color: '#fff' }}>
                {idx + 1}
              </span>
              <span className="text-[0.8125rem] leading-relaxed" style={{color:'#3D2517'}}>{line}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── 主应用 ───
export default function App() {
  const [projects, setProjects] = useState([])
  const [todos, setTodos] = useState([])
  const [plan, setPlan] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingPlan, setEditingPlan] = useState(false)
  const [inboxOpen, setInboxOpen] = useState(false)
  const [matrixModalOpen, setMatrixModalOpen] = useState(false)
  const [matrixTags, setMatrixTags] = useState({})
  const [reviewOpen, setReviewOpen] = useState(false)
  const [showAddProject, setShowAddProject] = useState(false)
  const [newProject, setNewProject] = useState({ name: '', emoji: '📁' })
  const [newTodo, setNewTodo] = useState('')
  const [todayCount, setTodayCount] = useState(0)
  const [draggingId, setDraggingId] = useState(null)
  const [overId, setOverId] = useState(null)
  const [workflow, setWorkflow] = useState({ steps: [] })

  // 初始数据加载
  useEffect(() => {
    async function loadAll() {
      try {
        const [projData, todoData, planData, wfData] = await Promise.all([
          apiGet('/projects'),
          apiGet('/todos'),
          apiGet('/plan'),
          apiGet('/workflow'),
        ])
        setProjects(projData)
        setTodos(todoData)
        setPlan(planData.content || '')
        setWorkflow(wfData)
      } catch (e) {
        console.error('Failed to load data:', e)
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [])

  useEffect(() => {
    const today = todos.filter(t => t.deadline === 'today')
    setTodayCount(today.filter(t => !t.done).length)
  }, [todos])

  // 项目排序
  function handleDragStart(id) {
    setDraggingId(id)
  }
  function handleDragOver(e, id) {
    e.preventDefault()
    if (id === draggingId) return
    setOverId(id)
  }
  function handleDragLeave() {
    setOverId(null)
  }
  function handleDrop(e, targetId) {
    e.preventDefault()
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null)
      setOverId(null)
      return
    }
    const dragIdx = projects.findIndex(p => p.id === draggingId)
    const overIdx = projects.findIndex(p => p.id === targetId)
    if (dragIdx < 0 || overIdx < 0) return
    const reordered = [...projects]
    const [dragged] = reordered.splice(dragIdx, 1)
    reordered.splice(overIdx, 0, dragged)
    // Update sort_order for all affected projects
    const updates = reordered.map((p, i) => ({ ...p, sort_order: i }))
    setProjects(updates)
    // Persist to API
    updates.forEach(p => apiPut(`/projects/${p.id}`, { sort_order: p.sort_order }).catch(console.error))
    setDraggingId(null)
    setOverId(null)
  }
  function handleDragEnd() {
    setDraggingId(null)
    setOverId(null)
  }

  // 项目操作
  async function handleUpdateProject(id, form) {
    try {
      await apiPut(`/projects/${id}`, form)
      const updated = projects.map(p => p.id === id ? { ...p, ...form } : p)
      setProjects(updated)
    } catch (e) { console.error(e) }
  }

  async function handleDeleteProject(id) {
    if (!confirm('确定删除此项目？')) return
    try {
      await apiDelete(`/projects/${id}`)
      setProjects(projects.filter(p => p.id !== id))
    } catch (e) { console.error(e) }
  }

  async function handleAddProject() {
    if (!newProject.name.trim()) return
    try {
      const item = { id: `project_${Date.now()}`, ...newProject, problem: '', plan: '', target: '' }
      const created = await apiPost('/projects', item)
      setProjects([...projects, created])
      setNewProject({ name: '', emoji: '📁' })
      setShowAddProject(false)
    } catch (e) { console.error(e) }
  }

  // 待办操作
  async function handleAddTodo() {
    if (!newTodo.trim()) return
    try {
      const item = { id: `todo_${Date.now()}`, text: newTodo.trim(), deadline: 'today', priority: 'medium', done: false }
      const created = await apiPost('/todos', item)
      setTodos([created, ...todos])
      setNewTodo('')
    } catch (e) { console.error(e) }
  }

  async function handleToggleTodo(id) {
    const todo = todos.find(t => t.id === id)
    if (!todo) return
    try {
      await apiPut(`/todos/${id}`, { ...todo, done: !todo.done })
      setTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t))
    } catch (e) { console.error(e) }
  }

  async function handleDeleteTodo(id) {
    try {
      await apiDelete(`/todos/${id}`)
      setTodos(todos.filter(t => t.id !== id))
    } catch (e) { console.error(e) }
  }

  async function handleMoveToday(id, extras = {}) {
    const todo = todos.find(t => t.id === id)
    if (!todo) return
    try {
      const updates = { ...todo, deadline: 'today', ...extras }
      await apiPut(`/todos/${id}`, updates)
      setTodos(todos.map(t => t.id === id ? { ...t, deadline: 'today', ...extras } : t))
    } catch (e) { console.error(e) }
  }

  async function handleAddFromInbox(text, deadline) {
    try {
      const item = { id: `todo_${Date.now()}`, text, deadline: deadline || 'inbox', priority: 'medium', done: false }
      const created = await apiPost('/todos', item)
      setTodos([created, ...todos])
    } catch (e) { console.error(e) }
  }

  async function handleSavePlan(text) {
    try {
      await apiPut('/plan', { content: text })
      setPlan(text)
      setEditingPlan(false)
    } catch (e) { console.error(e) }
  }

  async function handleSaveWorkflow(wf) {
    try {
      const updated = await apiPut('/workflow', { steps: wf.steps })
      setWorkflow(updated)
    } catch (e) { console.error(e) }
  }

  if (loading) {
    return (
      <div className="min-h-screen relative" style={{ zIndex: 1, backgroundColor: '#121212' }}>
        <StarField />
        <div className="relative z-10 flex items-center justify-center h-screen">
          <div className="text-[#6366f1] text-lg font-medium">加载中...</div>
        </div>
      </div>
    )
  }

  const todayTodos = todos.filter(t => t.deadline === 'today')

  return (
    <div className="min-h-screen relative" style={{ zIndex: 1, backgroundColor: '#121212' }}>
      <StarField />

      {/* 主内容 */}
      <div className="relative max-w-[1100px] mx-auto px-6 py-8">

        {/* 顶部导航 */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <a
              href="/xingye/"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[0.8125rem] font-medium transition-all"
              style={{ backgroundColor: '#FFF7F0', border: '1px solid rgba(180,120,80,0.15)', color:'#3D2517' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FFF0E3' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#FFF7F0' }}
            >
              <ArrowLeft size={14} />
              返回首页
            </a>
            <div className="flex items-center gap-2">
              <Zap size={20} style={{ color: '#C8742A' }} />
              <h1 className="font-bold text-[1.125rem] tracking-tight" style={{color:'#3D2517'}}>每日行动</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setReviewOpen(true)}
              className="relative p-2.5 rounded-xl transition-all"
              style={{ backgroundColor: '#FFF7F0', border: '1px solid rgba(180,120,80,0.15)', color:'#3D2517' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FFF5EA' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#FFFBF5' }}
              title="每日复盘"
            >
              <Clock size={18} style={{color:'#3D2517'}} />
            </button>

            <button
              onClick={() => setInboxOpen(true)}
              className="relative p-2.5 rounded-xl transition-all"
              style={{ backgroundColor: '#FFF7F0', border: '1px solid rgba(180,120,80,0.15)', color:'#3D2517' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FFF5EA' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#FFFBF5' }}
              title="收集箱"
            >
              <Inbox size={18} style={{color:'#3D2517'}} />
              {inboxOpen ? null : todos.filter(t => t.deadline === 'inbox').length > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[0.6rem] font-bold flex items-center justify-center text-white"
                  style={{ backgroundColor: ACCENT }}
                >
                  {todos.filter(t => t.deadline === 'inbox').length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* 左侧：规划 + 项目 */}
          <div className="lg:col-span-2 space-y-6">

            {/* 每日规划 */}
            <div className="rounded-xl p-6" style={{ backgroundColor: '#FFF9F4', border: '1px solid rgba(180,120,80,0.2)' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <Target size={17} style={{ color: '#C8742A' }} />
                  <h2 className="font-semibold text-[0.9375rem]" style={{color:'#3D2517'}}>每日规划</h2>
                </div>
                <button
                  onClick={() => editingPlan ? handleSavePlan(plan) : setEditingPlan(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.8125rem] font-medium transition-all"
                  style={{
                    color: editingPlan ? '#fff' : ACCENT,
                    backgroundColor: editingPlan ? ACCENT : 'rgba(99,102,241,0.1)',
                  }}
                  onMouseEnter={e => { if (!editingPlan) e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.2)' }}
                  onMouseLeave={e => { if (!editingPlan) e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.1)' }}
                >
                  {editingPlan ? <><Save size={13} /> 保存</> : <><Edit3 size={13} /> 编辑</>}
                </button>
              </div>
              {editingPlan ? (
                <textarea
                  value={plan}
                  onChange={e => setPlan(e.target.value)}
                  placeholder="写下今天的规划... 明确、可执行"
                  rows={5}
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl text-[0.875rem] resize-none focus:outline-none transition-colors" style={{backgroundColor:'#FFFBF5',color:'#3D2517',border:'1px solid rgba(180,120,80,0.2)'}}
                />
              ) : (
                <p className="min-h-[100px] text-[0.875rem] leading-relaxed whitespace-pre-wrap" style={{color:'#3D2517'}}>
                  {plan || <span className="italic" style={{ color: '#7A5030' }}>点击右上角「编辑」开始规划今天要做的事情...</span>}
                </p>
              )}
            </div>

            {/* 项目进度 */}
            <div className="rounded-xl p-6" style={{ backgroundColor: '#FFF9F4', border: '1px solid rgba(180,120,80,0.2)' }}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <FolderKanban size={17} style={{ color: '#C8742A' }} />
                  <h2 className="font-semibold text-[0.9375rem]" style={{color:'#3D2517'}}>项目进度</h2>
                </div>
                <button
                  onClick={() => setShowAddProject(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.8125rem] font-medium transition-all"
                  style={{ color: '#C8742A', backgroundColor: 'rgba(200,116,42,0.1)' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.1)'}
                >
                  <Plus size={13} /> 添加项目
                </button>
              </div>

              {showAddProject && (
                <div className="mb-4 p-4 rounded-xl" style={{ backgroundColor: '#FFFBF5', border: '1px solid rgba(180,120,80,0.2)' }}>
                  <div className="flex gap-2 mb-2">
                    <input
                      value={newProject.emoji}
                      onChange={e => setNewProject({ ...newProject, emoji: e.target.value })}
                      placeholder="😀"
                      className="w-12 text-center px-2 py-1.5 rounded-lg text-[0.875rem] focus:outline-none"
                      style={{ backgroundColor: '#FFFBF5', border: '1px solid rgba(180,120,80,0.2)', color:'#3D2517' }}
                    />
                    <input
                      value={newProject.name}
                      onChange={e => setNewProject({ ...newProject, name: e.target.value })}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddProject() }}
                      placeholder="项目名称"
                      autoFocus
                      className="flex-1 px-3 py-1.5 rounded-lg text-[0.875rem] placeholder:text-[#BB8866] focus:outline-none"
                      style={{ backgroundColor: '#FFFBF5', border: '1px solid rgba(180,120,80,0.2)', color:'#3D2517' }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleAddProject} className="flex-1 py-1.5 rounded-lg text-white text-[0.8125rem] font-medium transition-all" style={{ backgroundColor: ACCENT }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = ACCENT_LIGHT}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = ACCENT}>
                      添加
                    </button>
                    <button onClick={() => { setShowAddProject(false); setNewProject({ name: '', emoji: '📁' }) }}
                      className="px-4 py-1.5 rounded-lg text-[0.8125rem] transition-colors"
                      style={{ backgroundColor: 'rgba(200,116,42,0.08)', color:'#7A5030' }}>
                      取消
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {projects.map(p => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    onUpdate={handleUpdateProject}
                    onDelete={handleDeleteProject}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                    isDragging={draggingId}
                    isOver={overId}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 右侧：今日待办 + 工作流 */}
          <div className="space-y-6">
            {/* 今日待办 */}
            <div className="rounded-xl p-5" style={{ backgroundColor: '#FFF9F4', border: '1px solid rgba(180,120,80,0.2)' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <ListTodo size={17} style={{ color: '#C8742A' }} />
                  <h2 className="font-semibold text-[0.9375rem]" style={{color:'#3D2517'}}>今日待办</h2>
                  <span className="text-[0.75rem]" style={{color:'#7A5030'}}>({todayCount} 待完成)</span>
                </div>
              </div>
              {todayTodos.length === 0 ? (
                <p className="text-[0.8125rem] text-center py-4" style={{color:'#7A5030'}}>暂无今日待办</p>
              ) : (
                <div className="space-y-2">
                  {todayTodos.map(todo => (
                    <TodoItem key={todo.id} todo={todo} onToggle={handleToggleTodo} onDelete={handleDeleteTodo} onMoveToday={handleMoveToday} />
                  ))}
                </div>
              )}
            </div>

            <WorkflowCard workflow={workflow} onUpdate={handleSaveWorkflow} />
          </div>
        </div>

        {/* 底部 */}
        <div className="text-center mt-12">
          <p className="text-[#555] text-[0.75rem]">星夜 · 每日行动</p>
        </div>
      </div>

      {/* 收集箱侧边栏 */}
      <InboxSidebar
        open={inboxOpen}
        onClose={() => setInboxOpen(false)}
        todos={todos}
        onAdd={handleAddFromInbox}
        onToggle={handleToggleTodo}
        onMoveToday={handleMoveToday}
        onDelete={handleDeleteTodo}
        onOpenMatrix={() => setMatrixModalOpen(true)}
      />
      <MatrixModal
        open={matrixModalOpen}
        onClose={() => setMatrixModalOpen(false)}
        todos={todos}
        matrixTags={matrixTags}
        setMatrixTags={setMatrixTags}
        onToggle={handleToggleTodo}
        onMoveToday={handleMoveToday}
        onDelete={handleDeleteTodo}
      />

      {/* 复盘侧边栏 */}
      <ReviewSidebar
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
      />
    </div>
  )
}
