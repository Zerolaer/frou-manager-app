
import React from 'react'

type Props = {
  title: string
  values: number[]
  isCurrentYear: boolean
  currentMonth: number
  fmt: (n:number)=>string
}

export default function SummaryRow({ title, values, isCurrentYear, currentMonth, fmt }: Props){
  return (
    <div className="finance-row contents">
      <div className="finance-cell"><div className="cell-head" style={{fontWeight:700}}>{title}</div></div>
      {values.map((v,i)=>(
        <div className={'finance-cell ' + (isCurrentYear && i===currentMonth ? 'col-current' : '')} key={i}>
          <div className="cell-head cell-right" style={{fontWeight:700}}>{fmt(v)}</div>
        </div>
      ))}
    </div>
  )
}
