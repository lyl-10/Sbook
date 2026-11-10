'use client'
import { useState, useRef, useEffect } from 'react'

type Message = {
  role: 'user' | 'ai'
  content: string
  refSource?: string
}

export default function ChatPage() {
  const [msgList, setMsgList] = useState<Message[]>([
    {role:"ai",content:"你好，可以基于已经上传的知识库文档向我提问。"}
  ])
  const [inputText, setInputText] = useState('')
  const chatBoxRef = useRef<HTMLDivElement>(null)

  //自动滚动到底部
  useEffect(()=>{
    if(chatBoxRef.current){
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight
    }
  },[msgList])

  const sendMessage = ()=>{
    if(!inputText.trim()) return
    //添加用户消息
    const userMsg:Message = {role:"user",content:inputText}
    setMsgList([...msgList,userMsg])
    setInputText("")

    //模拟AI流式回复
    setTimeout(()=>{
      const aiMsg:Message = {
        role:"ai",
        content:"已检索知识库文档返回答案，这里模拟RAG大模型输出内容，对接后端后改为真实流式接口",
        refSource:"📖引用来源：文档1.pdf"
      }
      setMsgList(prev=>[...prev,aiMsg])
    },700)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-black">知识库问答</h1>
      <div className="bg-white rounded-xl h-[75vh] flex flex-col">
        {/*聊天框*/}
        <div ref={chatBoxRef} className="flex-grow p-6 overflow-y-auto">
          {msgList.map((item,idx)=>(
            <div key={idx} className={`mb-4 flex ${item.role==='user'?'justify-end':'justify-start'}`}>
              <div className={`max-w-[70%] p-3 rounded-lg
                ${item.role==='user'?'bg-blue-700 text-white':'bg-slate-100 text-gray-800'}`}>
                <p>{item.content}</p>
                {item.refSource && <p className="text-xs text-gray-500 mt-2">{item.refSource}</p>}
              </div>
            </div>
          ))}
        </div>
        {/*输入区域*/}
        <div className="p-6 border-t border-gray-100 flex gap-3">
                          <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="在这里输入你的问题"
                  className="flex-grow p-3 border rounded-lg resize-none text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
          <button
            onClick={sendMessage}
            className="bg-blue-700 hover:bg-blue-800 text-white px-6 rounded-lg"
          >发送提问</button>
        </div>
      </div>
    </div>
  )
}