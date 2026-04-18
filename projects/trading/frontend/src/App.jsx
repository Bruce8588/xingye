import { useState, useEffect } from 'react'
import { FileText, Network, Database, Palette, Menu, X, BarChart3, Shield, GripVertical, BookOpen, Table } from 'lucide-react'
import MemoList from './components/Memo/MemoList'
import LogicGroupList from './components/LogicGroups/LogicGroupList'
import StockList from './components/Stocks/StockList'
import TradingModelList from './components/TradingModels/TradingModelList'
import MarketInfoList from './components/MarketInfo/MarketInfoList'
import RiskControl from './components/RiskControl/RiskControl'
import TradingReview from './components/TradingReview/TradingReview'
import MarketRecords from './components/MarketRecords/MarketRecords'

const PENDING_STOCK_KEY = 'trading:pending-stock-id'
const PAGE_ORDER_KEY = 'trading:page-order'

// 图标注册表（只存字符串名称，不存组件对象）
const ICON_REGISTRY = {
  FileText,
  Network,
  Database,
  Palette,
  BarChart3,
  Shield,
  BookOpen,
  Table,
}

// 默认页面顺序（存 iconName 字符串，不存组件）
const DEFAULT_PAGE_ORDER = [
  { id: 'market',      label: '市场信息',   iconName: 'BarChart3' },
  { id: 'memos',       label: '宏观叙事',   iconName: 'FileText' },
  { id: 'logic-groups',label: '逻辑分组',   iconName: 'Network' },
  { id: 'stocks',      label: '股票管理',   iconName: 'Database' },
  { id: 'models',      label: '交易模型',   iconName: 'Palette' },
  { id: 'risk',        label: '决策与风控', iconName: 'Shield' },
  { id: 'review',      label: '交易复盘',   iconName: 'BookOpen' },
  { id: 'records',     label: '行情记录',   iconName: 'Table' },
]

// 从 localStorage 恢复页面顺序（id 匹配即可，iconName/label 自动补全）
const restorePageOrder = () => {
  try {
    const saved = localStorage.getItem(PAGE_ORDER_KEY)
    if (!saved) return DEFAULT_PAGE_ORDER
    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_PAGE_ORDER
    return parsed.map(item => {
      // id 存在于默认列表就保留，自动补全 iconName 和 label
      const defaultItem = DEFAULT_PAGE_ORDER.find(d => d.id === item.id)
      if (defaultItem) {
        return { ...defaultItem }
      }
      return null
    }).filter(Boolean)
  } catch {
    return DEFAULT_PAGE_ORDER
  }
}

function App() {
  const [activeTab, setActiveTab] = useState('market')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [initialStockId, setInitialStockId] = useState(() => {
    const saved = sessionStorage.getItem(PENDING_STOCK_KEY)
    if (saved) {
      sessionStorage.removeItem(PENDING_STOCK_KEY)
      return saved
    }
    return null
  })
  const [pageOrder, setPageOrder] = useState(restorePageOrder)
  const [editMode, setEditMode] = useState(false)
  const [draggedItem, setDraggedItem] = useState(null)

  const handleStockNavigate = (stockId) => {
    sessionStorage.setItem(PENDING_STOCK_KEY, stockId)
    setInitialStockId(stockId)
    setActiveTab('stocks')
  }

  useEffect(() => {
    const handleNavigateRecords = (e) => {
      sessionStorage.setItem('trading:pending-records-stock-id', e.detail.stockId)
      sessionStorage.setItem('trading:pending-records-stock-name', e.detail.stockName)
      setActiveTab('records')
    }
    window.addEventListener('navigate_records', handleNavigateRecords)
    return () => window.removeEventListener('navigate_records', handleNavigateRecords)
  }, [])

  // 保存页面顺序（只存 iconName 字符串，可安全序列化）
  const savePageOrder = (newOrder) => {
    setPageOrder(newOrder)
    localStorage.setItem(PAGE_ORDER_KEY, JSON.stringify(newOrder))
  }

  const handleDragStart = (e, item) => {
    setDraggedItem(item)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
  }

  const handleDragOver = (e, targetItem) => {
    e.preventDefault()
    if (!draggedItem || draggedItem.id === targetItem.id) return
    const newOrder = [...pageOrder]
    const draggedIndex = newOrder.findIndex(item => item.id === draggedItem.id)
    const targetIndex = newOrder.findIndex(item => item.id === targetItem.id)
    newOrder.splice(draggedIndex, 1)
    newOrder.splice(targetIndex, 0, draggedItem)
    savePageOrder(newOrder)
  }

  const resetPageOrder = () => {
    savePageOrder(DEFAULT_PAGE_ORDER)
    setEditMode(false)
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'memos':
        return <MemoList onStockClick={handleStockNavigate} />
      case 'logic-groups':
        return <LogicGroupList />
      case 'stocks':
        return <StockList key={initialStockId} initialStockId={initialStockId} />
      case 'models':
        return <TradingModelList />
      case 'risk':
        return <RiskControl />
      case 'review':
        return <TradingReview />
      case 'records':
        return <MarketRecords
          stockId={sessionStorage.getItem('trading:pending-records-stock-id')}
          stockName={sessionStorage.getItem('trading:pending-records-stock-name')}
          onBack={() => {
            sessionStorage.removeItem('trading:pending-records-stock-id')
            sessionStorage.removeItem('trading:pending-records-stock-name')
          }}
        />
      case 'market':
      default:
        return <MarketInfoList />
    }
  }

  return (
    <div className="flex h-screen bg-slate-900">
      {/* Sidebar Toggle Button */}
      <button
        className="fixed top-4 left-4 z-50 bg-slate-800 p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <div className={`
        flex-shrink-0 h-full bg-slate-800 border-r border-slate-700
        transition-all duration-200 ease-in-out overflow-hidden
        w-64 ${sidebarOpen ? 'md:w-64' : 'md:w-0 md:border-0'}
        ${sidebarOpen ? 'w-64' : 'w-0 border-0'}
      `}>
        <div className={`pt-16 p-6 w-64 ${!sidebarOpen ? 'md:hidden' : ''}`}>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-indigo-400 truncate pr-2">交易系统</h1>
            <button
              onClick={() => {
                if (editMode) {
                  resetPageOrder()
                } else {
                  setEditMode(true)
                }
              }}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                editMode
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'text-slate-500 hover:text-white'
              }`}
            >
              {editMode ? '完成' : '排序'}
            </button>
          </div>
          <nav className="space-y-1">
            {pageOrder.map((item) => {
              const Icon = ICON_REGISTRY[item.iconName] || BarChart3
              return (
                <div
                  key={item.id}
                  draggable={editMode}
                  onDragStart={(e) => handleDragStart(e, item)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, item)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg
                    transition-all duration-150 cursor-pointer
                    ${editMode ? 'bg-slate-700/50' : ''}
                    ${draggedItem?.id === item.id ? 'opacity-50' : ''}
                    ${activeTab === item.id
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }
                  `}
                  onClick={() => {
                    if (!editMode) {
                      setActiveTab(item.id)
                    }
                  }}
                >
                  {editMode && (
                    <GripVertical size={16} className="text-slate-500 cursor-grab" />
                  )}
                  <Icon size={20} />
                  <span>{item.label}</span>
                  {editMode && activeTab === item.id && (
                    <span className="ml-auto text-xs text-indigo-300">当前</span>
                  )}
                </div>
              )
            })}
          </nav>

          {editMode && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <p className="text-xs text-slate-500 mb-2">拖动排序，长按拖手柄移动</p>
              <button
                onClick={resetPageOrder}
                className="w-full text-xs text-slate-500 hover:text-white py-1"
              >
                恢复默认顺序
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto p-4 md:p-8">
        {renderContent()}
      </main>
    </div>
  )
}

export default App
