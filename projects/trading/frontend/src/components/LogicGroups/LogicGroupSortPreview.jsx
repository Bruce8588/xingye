/**
 * LogicGroupSortPreview.jsx
 * 逻辑分组自由排序功能预览 — 拖拽交互演示
 * 
 * 技术方案：
 * 1. 后端 LogicGroup 增加 sort_order 字段（Integer，默认0，按asc排序）
 * 2. 后端新增 PUT /api/logic-groups/reorder 接口
 * 3. 前端 LogicGroupList 支持拖拽排序，拖动时更新本地状态 + 调用reorder API持久化
 * 4. 新建分组时 sort_order 自动为 max+1
 */
import { useState, useEffect } from 'react'
import { GripVertical, Check } from 'lucide-react'

const API = '/api'

// 模拟数据（真实场景从 API 获取）
const MOCK_GROUPS = [
  { id: 1, name: '价值投资', description: '低估蓝筹，长持不动', color: '#6366f1', sort_order: 0 },
  { id: 2, name: '趋势交易', description: '追涨杀跌，顺势而为', color: '#ec4899', sort_order: 1 },
  { id: 3, name: '事件驱动', description: '财报季、并购重组等事件', color: '#f97316', sort_order: 2 },
  { id: 4, name: '困境反转', description: '基本面改善但股价低迷', color: '#22c55e', sort_order: 3 },
]

export default function LogicGroupSortPreview() {
  const [groups, setGroups] = useState(MOCK_GROUPS)
  const [draggedId, setDraggedId] = useState(null)
  const [savedOrder, setSavedOrder] = useState(null)
  const [isDragging, setIsDragging] = useState(false)

  // 拖拽开始
  const handleDragStart = (e, group) => {
    setDraggedId(group.id)
    setIsDragging(true)
    e.dataTransfer.effectAllowed = 'move'
    // 用0填充缺口，后续splice会自动修正
    e.dataTransfer.setData('text/plain', group.id)
  }

  // 拖拽经过
  const handleDragOver = (e, targetId) => {
    e.preventDefault()
    if (draggedId === null || draggedId === targetId) return

    const newGroups = [...groups]
    const draggedIdx = newGroups.findIndex(g => g.id === draggedId)
    const targetIdx = newGroups.findIndex(g => g.id === targetId)

    // 移动
    const [removed] = newGroups.splice(draggedIdx, 1)
    newGroups.splice(targetIdx, 0, removed)

    // 立即更新UI（乐观更新）
    setGroups(newGroups)
    setDraggedId(targetId) // 拖拽跟随
  }

  // 拖拽结束
  const handleDragEnd = () => {
    setDraggedId(null)
    setIsDragging(false)
    // 模拟持久化（实际调用 PUT /api/logic-groups/reorder）
    const orderPayload = groups.map((g, i) => ({ id: g.id, sort_order: i }))
    console.log('Reorder payload:', orderPayload)
    setSavedOrder(JSON.stringify(orderPayload, null, 2))
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-1">🔄 逻辑分组排序 — 功能预览</h2>
        <p className="text-sm text-slate-400">
          拖拽卡片即可自由排序，松开后自动保存到服务器。
          红色虚线框表示当前拖拽项跟随鼠标到的位置。
        </p>
      </div>

      {/* 预览说明 */}
      <div className="mb-4 bg-amber-900/30 border border-amber-700/50 rounded-lg p-3 text-sm text-amber-200">
        <strong>实现方案：</strong>
        <ul className="mt-1 space-y-0.5 text-amber-300/80">
          <li>① 后端 LogicGroup 表增加 sort_order 字段（Integer，默认为 id 顺序）</li>
          <li>② 后端新增 PUT /api/logic-groups/reorder，接收 [{'{id, sort_order}'}, ...]</li>
          <li>③ 前端拖拽时乐观更新 UI，松开后调用 reorder API 持久化</li>
          <li>④ 新建分组 sort_order 自动为 max+1</li>
          <li>⑤ GET /api/logic-groups 按 sort_order ASC 返回</li>
        </ul>
      </div>

      {/* 排序后的 Reorder Payload */}
      {savedOrder && (
        <div className="mb-4 bg-slate-800 rounded-lg p-3 border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <Check size={14} className="text-green-400" />
            <span className="text-sm text-green-400 font-medium">已保存到服务器</span>
          </div>
          <pre className="text-xs text-slate-400 overflow-x-auto">{savedOrder}</pre>
        </div>
      )}

      {/* 拖拽列表 */}
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((group, index) => {
          const isBeingDragged = draggedId === group.id
          return (
            <div
              key={group.id}
              draggable
              onDragStart={(e) => handleDragStart(e, group)}
              onDragOver={(e) => handleDragOver(e, group.id)}
              onDragEnd={handleDragEnd}
              className={`
                relative bg-slate-800 rounded-lg p-5 border transition-all duration-150 cursor-grab active:cursor-grabbing select-none
                ${isBeingDragged ? 'opacity-40 scale-95 border-indigo-500 border-2' : 'border-slate-700 hover:border-slate-600'}
              `}
            >
              {/* 拖拽手柄 */}
              <div className="absolute top-3 right-3 text-slate-600 hover:text-slate-400">
                <GripVertical size={18} />
              </div>

              {/* 排序序号标签 */}
              <div className="absolute bottom-2 right-3 text-xs text-slate-600 font-mono">
                #{index + 1}
              </div>

              <div className="flex items-start gap-4">
                <div
                  className="w-5 h-5 rounded-full mt-1 flex-shrink-0"
                  style={{ backgroundColor: group.color }}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-lg">{group.name}</h3>
                  {group.description && (
                    <p className="text-sm text-slate-400 mt-1 line-clamp-2">{group.description}</p>
                  )}
                  {/* 模拟操作按钮 */}
                  <div className="flex items-center gap-2 mt-4 flex-wrap">
                    <button className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm transition-colors">
                      添加股票
                    </button>
                    <button className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors">
                      查看
                    </button>
                    <button className="p-1.5 text-slate-400 hover:text-indigo-400 transition-colors">
                      ✏️
                    </button>
                    <button className="p-1.5 text-slate-400 hover:text-red-400 transition-colors">
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 提示 */}
      <p className="text-center text-slate-600 text-xs mt-6">
        💡 拖拽手柄（⋮⋮）即可自由排序
      </p>
    </div>
  )
}
