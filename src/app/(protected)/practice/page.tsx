'use client'
import { useState } from 'react'

export default function PracticePage(){
  const [answer, setAnswer] = useState('')
  const [showExplain, setShowExplain] = useState(false)

  const submitAnswer = ()=>{
    setShowExplain(true)
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-black">智能推题 + AI讲解</h2>
      <div className="bg-white rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4 text-slate-500">AI根据你的错题记录推送相似题目</h3>
        <div className="mb-6">
          <p className="text-gray-700">【模拟题目】</p>
        </div>
        <textarea
  value={answer}
  onChange={(e) => setAnswer(e.target.value)}
  placeholder="在这里写下你的答案"
  className="w-full border rounded-lg p-3 resize-none text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
  rows={4}
/>
        <button
          onClick={submitAnswer}
          className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-3 rounded-lg mt-4"
        >提交作答,获取AI讲解</button>
        {showExplain && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-bold mb-2 text-blue-900">🤖 AI讲解</h4>
            <p className="text-slate-700 leading-relaxed">
              这里模拟大模型返回的解题思路与知识点解析，对接后端之后替换为真实接口返回的流式讲解</p>
          </div>
        )}
      </div>
    </div>
  )
}