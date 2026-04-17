import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit2, Trash2, Save, X, Palette, Eye, Edit3 } from 'lucide-react'
import DrawingCanvas from '../Canvas/DrawingCanvas'

const API = '/api'

export default function TradingModelList() {
  const [models, setModels] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [viewMode, setViewMode] = useState(null) // null, 'view', 'edit'
  const [formData, setFormData] = useState({ name: '', description: '' })
  const [drawingData, setDrawingData] = useState(null)
  const [currentModelId, setCurrentModelId] = useState(null)

  useEffect(() => {
    fetchModels()
  }, [])

  const fetchModels = async () => {
    try {
      const res = await fetch(`${API}/models`)
      const data = await res.json()
      setModels(data)
    } catch (err) {
      console.error('Failed to fetch models:', err)
    }
  }

  const handleCreate = async () => {
    if (!formData.name.trim()) return
    try {
      const res = await fetch(`${API}/models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, drawing_data: drawingData })
      })
      const newModel = await res.json()
      setModels([newModel, ...models])
      resetForm()
      // Open editor for new model
      openEditor(newModel)
    } catch (err) {
      console.error('Failed to create model:', err)
    }
  }

  const handleUpdate = async () => {
    if (!editingId || !formData.name.trim()) return
    try {
      const res = await fetch(`${API}/models/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, drawing_data: drawingData })
      })
      const updated = await res.json()
      setModels(models.map(m => m.id === editingId ? updated : m))
      resetForm()
      setViewMode(null)
    } catch (err) {
      console.error('Failed to update model:', err)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('确定删除这个交易模型？')) return
    try {
      await fetch(`${API}/models/${id}`, { method: 'DELETE' })
      setModels(models.filter(m => m.id !== id))
    } catch (err) {
      console.error('Failed to delete model:', err)
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({ name: '', description: '' })
    setDrawingData(null)
  }

  const openEditor = (model) => {
    setEditingId(model.id)
    setFormData({ name: model.name, description: model.description || '' })
    setDrawingData(model.drawing_data)
    setCurrentModelId(model.id)
    setViewMode('edit')
    setShowForm(false)
  }

  const openViewer = (model) => {
    setCurrentModelId(model.id)
    setDrawingData(model.drawing_data)
    setFormData({ name: model.name, description: model.description })
    setViewMode('view')
  }

  const handleCanvasSave = useCallback((dataUrl) => {
    setDrawingData(dataUrl)
    // Auto-save to backend
    if (currentModelId) {
      fetch(`${API}/models/${currentModelId}/drawing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drawing_data: dataUrl })
      }).catch(console.error)
    }
  }, [currentModelId])

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
  }

  // Editor/Viewer mode
  if (viewMode === 'edit' || viewMode === 'view') {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">{formData.name}</h2>
            {formData.description && (
              <p className="text-slate-400 mt-1">{formData.description}</p>
            )}
          </div>
          <button
            onClick={() => {
              setViewMode(null)
              setCurrentModelId(null)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            <X size={18} />
            返回列表
          </button>
        </div>

        <div className="flex-1 bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
          {viewMode === 'edit' ? (
            <>
              <div className="p-3 bg-slate-800 border-b border-slate-700">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-slate-700 text-white rounded px-3 py-2 mr-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="模型名称"
                />
                <button
                  onClick={handleUpdate}
                  className="flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                >
                  <Save size={16} />
                  保存
                </button>
              </div>
              <div className="flex-1 h-[calc(100%-60px)]">
                <DrawingCanvas
                  initialData={drawingData}
                  onSave={handleCanvasSave}
                />
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col">
              <div className="p-4 bg-slate-800 border-b border-slate-700">
                <p className="text-slate-300 whitespace-pre-wrap">{formData.description || '暂无描述'}</p>
              </div>
              <div className="flex-1 p-4 flex items-center justify-center bg-slate-700">
                {drawingData ? (
                  <img
                    src={drawingData}
                    alt={formData.name}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <p className="text-slate-500">暂无绘图数据</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // List mode
  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">交易模型</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
        >
          <Plus size={18} />
          新建模型
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mb-6 bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 className="font-semibold text-white mb-4">创建新模型</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">模型名称</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="如：突破策略示意图"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">描述</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3}
                placeholder="描述这个交易模型的逻辑..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
            >
              <Palette size={16} />
              创建并编辑
            </button>
          </div>
        </div>
      )}

      {/* Model grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {models.map((model) => (
          <div key={model.id} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            {/* Preview */}
            <div className="h-40 bg-slate-700 flex items-center justify-center">
              {model.drawing_data ? (
                <img
                  src={model.drawing_data}
                  alt={model.name}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <Palette size={48} className="text-slate-600" />
              )}
            </div>
            {/* Info */}
            <div className="p-4">
              <h3 className="font-semibold text-white truncate">{model.name}</h3>
              <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                {model.description || '暂无描述'}
              </p>
              <p className="text-xs text-slate-500 mt-2">{formatDate(model.updated_at)}</p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => openViewer(model)}
                  className="flex items-center gap-1 px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors"
                >
                  <Eye size={14} /> 查看
                </button>
                <button
                  onClick={() => openEditor(model)}
                  className="flex items-center gap-1 px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors"
                >
                  <Edit3 size={14} /> 编辑
                </button>
                <button
                  onClick={() => handleDelete(model.id)}
                  className="p-1 text-slate-400 hover:text-red-400 transition-colors ml-auto"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {models.length === 0 && (
          <div className="col-span-full text-center text-slate-500 py-12">
            <Palette size={48} className="mx-auto mb-4 opacity-50" />
            <p>暂无交易模型，点击新建开始</p>
            <p className="text-sm mt-2">支持文字描述和画图建模</p>
          </div>
        )}
      </div>
    </div>
  )
}
