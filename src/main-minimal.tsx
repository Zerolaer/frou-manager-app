import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles.css'

function App() {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Frovo - Менеджер твоей продуктивности</h1>
      <p>Приложение работает! Если вы видите это, значит сборка прошла успешно.</p>
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
        <p><strong>Статус:</strong> ✅ Приложение запущено</p>
        <p><strong>Версия:</strong> Production Build</p>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
