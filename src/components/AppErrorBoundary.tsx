import React from 'react'

type Props = { children: React.ReactNode, fallback?: React.ReactNode }
type State = { hasError: boolean, error?: Error }

export default class AppErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props){
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError(error: Error){
    return { hasError: true, error }
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo){
    console.error('AppErrorBoundary caught:', error, errorInfo)
  }
  render(){
    if (this.state.hasError){
      return this.props.fallback ?? (
        <div className="p-6">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="text-lg font-semibold mb-2">Что-то пошло не так</div>
            <div className="text-sm opacity-75">Попробуй обновить страницу или вернуться на главную.</div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
