import { useRef, useState, useEffect, useCallback } from 'react'
import { Pencil, Eraser, Trash2, Undo2, Square, Circle, Type, Minus } from 'lucide-react'

const TOOLS = {
  brush: { icon: Pencil, name: '画笔' },
  eraser: { icon: Eraser, name: '橡皮擦' },
  line: { icon: Minus, name: '直线' },
  rectangle: { icon: Square, name: '矩形' },
  circle: { icon: Circle, name: '圆形' },
  text: { icon: Type, name: '文字' }
}

const COLORS = [
  '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1'
]

export default function DrawingCanvas({ initialData, onSave }) {
  const canvasRef = useRef(null)
  const [tool, setTool] = useState('brush')
  const [color, setColor] = useState('#ffffff')
  const [lineWidth, setLineWidth] = useState(3)
  const [isDrawing, setIsDrawing] = useState(false)
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [startPos, setStartPos] = useState(null)
  const [textInput, setTextInput] = useState('')
  const [textPos, setTextPos] = useState(null)

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    if (initialData) {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0)
        saveToHistory()
      }
      img.src = initialData
    } else {
      saveToHistory()
    }
  }, [])

  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL()
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(dataUrl)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
    if (onSave) onSave(dataUrl)
  }, [history, historyIndex, onSave])

  const redrawFromHistory = useCallback((index) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || index < 0 || index >= history.length) return
    
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = '#1e293b'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
    }
    img.src = history[index]
  }, [history])

  const getPos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  const handleStart = (e) => {
    e.preventDefault()
    const pos = getPos(e)
    setStartPos(pos)
    setIsDrawing(true)

    if (tool === 'text') {
      setTextPos(pos)
      return
    }

    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    ctx.beginPath()
    ctx.strokeStyle = tool === 'eraser' ? '#1e293b' : color
    ctx.lineWidth = tool === 'eraser' ? lineWidth * 3 : lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (tool === 'brush' || tool === 'eraser') {
      ctx.moveTo(pos.x, pos.y)
    }
  }

  const handleMove = (e) => {
    if (!isDrawing || tool === 'text' || !startPos) return
    e.preventDefault()
    const pos = getPos(e)
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    if (tool === 'brush' || tool === 'eraser') {
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    }
  }

  const handleEnd = (e) => {
    if (!isDrawing) return
    if (tool === 'text') {
      setIsDrawing(false)
      return
    }
    
    const pos = getPos(e)
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx || !startPos) return

    ctx.strokeStyle = tool === 'eraser' ? '#1e293b' : color
    ctx.lineWidth = tool === 'eraser' ? lineWidth * 3 : lineWidth

    if (tool === 'line') {
      ctx.beginPath()
      ctx.moveTo(startPos.x, startPos.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    } else if (tool === 'rectangle') {
      ctx.beginPath()
      ctx.rect(startPos.x, startPos.y, pos.x - startPos.x, pos.y - startPos.y)
      ctx.stroke()
    } else if (tool === 'circle') {
      const radius = Math.sqrt(Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2))
      ctx.beginPath()
      ctx.arc(startPos.x, startPos.y, radius, 0, Math.PI * 2)
      ctx.stroke()
    }

    setIsDrawing(false)
    setStartPos(null)
    saveToHistory()
  }

  const handleTextSubmit = () => {
    if (!textInput.trim() || !textPos) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.font = `${lineWidth * 5}px sans-serif`
    ctx.fillStyle = color
    ctx.fillText(textInput, textPos.x, textPos.y)
    setTextInput('')
    setTextPos(null)
    setIsDrawing(false)
    saveToHistory()
  }

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      redrawFromHistory(newIndex)
    }
  }

  const handleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    saveToHistory()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-4 p-3 bg-slate-800 border-b border-slate-700 flex-wrap">
        {/* Tools */}
        <div className="flex gap-1">
          {Object.entries(TOOLS).map(([key, { icon: Icon, name }]) => (
            <button
              key={key}
              onClick={() => setTool(key)}
              title={name}
              className={`p-2 rounded transition-colors ${tool === key ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
            >
              <Icon size={18} />
            </button>
          ))}
        </div>

        {/* Colors */}
        <div className="flex gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full transition-transform ${color === c ? 'ring-2 ring-white scale-110' : ''}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* Line width */}
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="1"
            max="20"
            value={lineWidth}
            onChange={(e) => setLineWidth(parseInt(e.target.value))}
            className="w-20"
          />
          <span className="text-sm text-slate-400 w-6">{lineWidth}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-1 ml-auto">
          <button onClick={handleUndo} title="撤销" className="p-2 text-slate-400 hover:bg-slate-700 rounded transition-colors">
            <Undo2 size={18} />
          </button>
          <button onClick={handleClear} title="清空" className="p-2 text-slate-400 hover:bg-slate-700 rounded transition-colors">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative bg-slate-700 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="w-full h-full cursor-crosshair touch-none"
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />

        {/* Text input overlay */}
        {textPos && (
          <div
            className="absolute bg-slate-900 p-2 rounded shadow-lg"
            style={{ left: textPos.x, top: textPos.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
              className="bg-slate-700 text-white px-2 py-1 rounded text-sm focus:outline-none"
              placeholder="输入文字..."
              autoFocus
            />
            <div className="flex gap-1 mt-1">
              <button onClick={handleTextSubmit} className="px-2 py-1 bg-indigo-600 text-white text-xs rounded">确定</button>
              <button onClick={() => setTextPos(null)} className="px-2 py-1 bg-slate-600 text-white text-xs rounded">取消</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
