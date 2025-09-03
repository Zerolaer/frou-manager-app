import { Outlet, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Sidebar from './components/Sidebar'

export default function App(){
  const location = useLocation()
  const isFinance = location.pathname.toLowerCase().includes('finance')

  return (
    <div className={`app-shell flex ${isFinance ? 'finance-mode' : ''}`}>
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Header />
        <div className={`content-scroll p-6 bg-gray-100 ${isFinance ? 'finance-page' : ''}`}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
