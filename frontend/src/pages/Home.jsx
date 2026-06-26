import React, { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { backend_url } from '../lib/config'
import {
  Menu,
  Search,
  PanelLeft,
  Plus,
  MessageSquare,
  Folder,
  LogOut,
  Maximize2,
  Mic,
  Send,
  ChevronDown,
  BookOpen,
  Clock,
  Grid,
  Code,
  MoreHorizontal,
  Sparkles,
  Globe,
  Copy,
  Check
} from 'lucide-react'

function Home({ user, token, supabase }) {
  const [conversations, setConversations] = useState([])
  const [activeConversationId, setActiveConversationId] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [selectedModel, setSelectedModel] = useState('ChatGPT')
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false)
  const [copiedId, setCopiedId] = useState(null)

  const messagesEndRef = useRef(null)
  const dropdownRef = useRef(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingMessage])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsModelDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch all conversations for user on mount & token availability
  useEffect(() => {
    async function fetchConversations() {
      if (token) {
        try {
          const res = await axios.get(`${backend_url}/conversation`, {
            headers: { authorization: token }
          })
          setConversations(res.data || [])
        } catch (e) {
          console.error("Error fetching conversations:", e)
        }
      }
    }
    fetchConversations()
  }, [token])

  // Load a selected conversation
  const selectConversation = async (conversationId) => {
    if (!token) return
    setActiveConversationId(conversationId)
    setStreamingMessage('')
    try {
      const res = await axios.get(`${backend_url}/conversation/${conversationId}`, {
        headers: { authorization: token }
      })
      setMessages(res.data.Messages || [])
    } catch (e) {
      console.error("Error loading conversation:", e)
    }
  }

  // Set up a new chat state
  const handleNewChat = () => {
    setActiveConversationId(null)
    setMessages([])
    setStreamingMessage('')
  }

  // Log out the user
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
    } catch (e) {
      console.error("Logout failed:", e)
    }
  }

  // Handle message submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!inputValue.trim() || !token || isStreaming) return

    const query = inputValue
    setInputValue('')

    // Append user message immediately
    const userMsg = { role: 'User', content: query, createdAt: new Date() }
    setMessages((prev) => [...prev, userMsg])
    setIsStreaming(true)
    setStreamingMessage('')

    try {
      let response
      if (!activeConversationId) {
        // First message - start new conversation
        response = await fetch(`${backend_url}/ask`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'authorization': token
          },
          body: JSON.stringify({ query })
        })
      } else {
        // Follow up message in existing conversation
        response = await fetch(`${backend_url}/ask/followup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'authorization': token
          },
          body: JSON.stringify({ query, conversationId: activeConversationId })
        })
      }

      if (!response.ok) {
        throw new Error(`Server returned error status ${response.status}`)
      }

      // Try to read conversation ID header if it is a new chat
      if (!activeConversationId) {
        const headerId = response.headers.get('X-Conversation-Id')
        if (headerId) {
          setActiveConversationId(headerId)
        }
      }

      // Read response stream chunks
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value, { stream: true })
        assistantContent += text
        setStreamingMessage(assistantContent)
      }

      // Finish streaming, final sync
      setIsStreaming(false)
      setStreamingMessage('')

      // Reload conversations list to display updated or new conversation title
      const listRes = await axios.get(`${backend_url}/conversation`, {
        headers: { authorization: token }
      })
      setConversations(listRes.data || [])

      // Reload messages list of the active conversation to get clean backend stored state
      const targetId = activeConversationId || response.headers.get('X-Conversation-Id')
      if (targetId) {
        setActiveConversationId(targetId)
        const msgRes = await axios.get(`${backend_url}/conversation/${targetId}`, {
          headers: { authorization: token }
        })
        setMessages(msgRes.data.Messages || [])
      }

    } catch (err) {
      console.error("Stream error:", err)
      setIsStreaming(false)
      setMessages((prev) => [
        ...prev,
        { role: 'Assistant', content: "Sorry, I encountered an error streaming that response. Please try again.", createdAt: new Date() }
      ])
    }
  }

  // Get initials for profile avatar
  const getInitials = () => {
    if (user?.user_metadata?.full_name) {
      const names = user.user_metadata.full_name.split(' ')
      if (names.length >= 2) {
        return (names[0][0] + names[1][0]).toUpperCase()
      }
      return names[0][0].toUpperCase()
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase()
    }
    return 'US'
  }

  // Copy code helper
  const handleCopyCode = (code, id) => {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Message formatter function
  const renderMessageContent = (content, messageIndex) => {
    if (!content) return null

    // Split sources by key delimiter
    const parts = content.split("________Sources____________________")
    const mainText = parts[0] || ""
    let sources = []
    if (parts[1]) {
      try {
        sources = JSON.parse(parts[1].trim())
      } catch (e) {
        // Fallback silently if not valid JSON yet
      }
    }

    // Split code blocks
    const tokens = mainText.split(/(```[\s\S]*?```)/g)

    return (
      <div className="space-y-3.5 text-[15px] leading-7 text-neutral-800 font-sans tracking-wide">
        {tokens.map((token, index) => {
          if (token.startsWith("```")) {
            const match = token.match(/```(\w*)\n([\s\S]*?)```/)
            const lang = match ? match[1] : ""
            const code = match ? match[2] : token.slice(3, -3)
            const blockId = `${messageIndex}-${index}`

            return (
              <div key={index} className="my-4 rounded-xl overflow-hidden border border-neutral-200/80 bg-zinc-950 text-zinc-100 font-mono text-sm shadow-sm">
                <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800/60 text-xs text-zinc-400 font-sans">
                  <span className="uppercase tracking-wider font-semibold">{lang || 'code'}</span>
                  <button
                    onClick={() => handleCopyCode(code, blockId)}
                    className="flex items-center gap-1.5 hover:text-zinc-200 active:scale-95 transition-all duration-150 cursor-pointer"
                  >
                    {copiedId === blockId ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy code
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed">
                  <code>{code}</code>
                </pre>
              </div>
            )
          } else {
            return (
              <div key={index} className="whitespace-pre-line">
                {token.split('\n\n').map((paragraph, pIdx) => {
                  if (paragraph.startsWith('### ')) {
                    return <h3 key={pIdx} className="text-base font-bold text-neutral-900 mt-4 mb-2">{paragraph.replace('### ', '')}</h3>
                  }
                  if (paragraph.startsWith('## ')) {
                    return <h2 key={pIdx} className="text-lg font-bold text-neutral-900 mt-5 mb-2">{paragraph.replace('## ', '')}</h2>
                  }
                  if (paragraph.startsWith('# ')) {
                    return <h1 key={pIdx} className="text-xl font-bold text-neutral-900 mt-6 mb-3">{paragraph.replace('# ', '')}</h1>
                  }
                  if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
                    return (
                      <ul key={pIdx} className="list-disc list-inside space-y-1.5 my-2.5 pl-2.5">
                        {paragraph.split('\n').map((li, liIdx) => (
                          <li key={liIdx} className="list-item text-neutral-700">{li.replace(/^[-*]\s+/, '')}</li>
                        ))}
                      </ul>
                    )
                  }
                  return <p key={pIdx} className="mb-3.5 last:mb-0 text-neutral-700">{paragraph}</p>
                })}
              </div>
            )
          }
        })}

        {/* Sources block */}
        {sources.length > 0 && (
          <div className="mt-6 pt-4 border-t border-neutral-100/80">
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">
              <Globe className="w-3.5 h-3.5" />
              Sources & References
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {sources.map((source, sIdx) => {
                let domain = ""
                try {
                  domain = new URL(source.url).hostname
                } catch (e) {
                  domain = source.url
                }
                return (
                  <a
                    key={sIdx}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 p-3 rounded-xl border border-neutral-150 bg-neutral-50/50 hover:bg-neutral-100 hover:border-neutral-250 transition-all duration-200 group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-white border border-neutral-200 flex items-center justify-center text-xs group-hover:border-neutral-300 transition-colors shadow-sm">
                      🔍
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider truncate">
                        {domain.replace("www.", "")}
                      </div>
                      <div className="text-xs text-neutral-600 truncate group-hover:text-black font-medium">
                        {source.url}
                      </div>
                    </div>
                  </a>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Combine full history list plus active streaming response if any
  const displayedMessages = [...messages]
  if (isStreaming && streamingMessage) {
    displayedMessages.push({ role: 'Assistant', content: streamingMessage })
  }

  const showEmptyState = displayedMessages.length === 0

  return (
    <div className="flex h-screen w-full bg-white text-neutral-900 font-sans overflow-hidden">
      
      {/* Sidebar navigation */}
      <div
        className={`${
          isSidebarOpen ? 'w-[260px]' : 'w-0'
        } shrink-0 bg-[#f9f9f9] border-r border-[#e3e3e3] flex flex-col h-full transition-all duration-300 ease-in-out overflow-hidden relative z-20`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-3.5 text-neutral-500">
          <button className="p-2 hover:bg-neutral-200/80 rounded-lg transition-colors cursor-pointer" title="Search chats">
            <Search className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 hover:bg-neutral-200/80 rounded-lg transition-colors cursor-pointer"
            title="Collapse sidebar"
          >
            <PanelLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Action / Option Menu */}
        <div className="px-3 py-1 space-y-0.5">
          <button
            onClick={handleNewChat}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group cursor-pointer ${
              activeConversationId === null
                ? 'bg-neutral-200 text-neutral-900 font-semibold'
                : 'text-neutral-600 hover:bg-neutral-200/60 hover:text-neutral-900'
            }`}
          >
            <MessageSquare className="w-4.5 h-4.5 group-hover:scale-105 transition-transform" />
            <span>New chat</span>
          </button>

          <button className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-200/60 hover:text-neutral-900 transition-all duration-200 cursor-pointer">
            <BookOpen className="w-4.5 h-4.5" />
            <span>Library</span>
          </button>

          <button className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-200/60 hover:text-neutral-900 transition-all duration-200 cursor-pointer">
            <Clock className="w-4.5 h-4.5" />
            <span>Scheduled</span>
          </button>

          <button className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-200/60 hover:text-neutral-900 transition-all duration-200 cursor-pointer">
            <Grid className="w-4.5 h-4.5" />
            <span>Apps</span>
          </button>

          <button className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-200/60 hover:text-neutral-900 transition-all duration-200 cursor-pointer">
            <Code className="w-4.5 h-4.5" />
            <span>Codex</span>
          </button>

          <button className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-200/60 hover:text-neutral-900 transition-all duration-200 cursor-pointer">
            <MoreHorizontal className="w-4.5 h-4.5" />
            <span>More</span>
          </button>
        </div>

        {/* Projects Section */}
        {/* <div className="mt-6 px-3.5">
          <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest px-2.5 mb-2">
            Projects
          </div>
          <div className="space-y-0.5">
            {['FSD Notes', 'Mentoring', 'GSAP Animations', 'Three Js', 'LinkedIn'].map((proj) => (
              <button
                key={proj}
                className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-200/60 hover:text-neutral-900 transition-all duration-150 cursor-pointer"
              >
                <Folder className="w-4.5 h-4.5 text-neutral-400" />
                <span className="truncate">{proj}</span>
              </button>
            ))}
            <button className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs font-semibold text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer">
              Show more
            </button>
          </div>
        </div> */}

        {/* Chats History Section */}
        <div className="flex-1 mt-6 overflow-y-auto px-3.5 border-t border-neutral-200/40 pt-4">
          <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest px-2.5 mb-2">
            Chats
          </div>
          <div className="space-y-0.5 pb-4">
            {conversations.length === 0 ? (
              <div className="text-xs text-neutral-400 px-2.5 py-2 italic">
                No past chats
              </div>
            ) : (
              conversations.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => selectConversation(chat.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all duration-150 cursor-pointer text-left ${
                    activeConversationId === chat.id
                      ? 'bg-neutral-200/90 text-neutral-900 font-semibold shadow-sm'
                      : 'text-neutral-600 hover:bg-neutral-200/60 hover:text-neutral-900'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 text-neutral-400 shrink-0" />
                  <span className="truncate flex-1">{chat.title || 'Untitled Chat'}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Bottom User profile panel */}
        <div className="p-3 border-t border-[#e3e3e3] bg-[#f9f9f9]">
          <div className="flex items-center gap-3 p-1 rounded-xl">
            <div className="w-9 h-9 rounded-full bg-[#0d9488] text-white flex items-center justify-center font-bold text-[13px] shadow-sm select-none">
              {getInitials()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-neutral-900 truncate">
                {user?.user_metadata?.full_name || 'User Account'}
              </div>
              <div className="text-xs text-neutral-400 truncate">
                {user?.email || 'Logged In'}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-neutral-200 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main chat workspace */}
      <div className="flex-1 flex flex-col h-full bg-white relative overflow-hidden">
        
        {/* Floating sidebar expand button (only visible when sidebar is collapsed) */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-4 left-4 p-2 bg-[#f9f9f9] border border-[#e3e3e3] text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 rounded-lg transition-all duration-200 shadow-sm z-30 cursor-pointer"
            title="Expand sidebar"
          >
            <PanelLeft className="w-5 h-5" />
          </button>
        )}

        {/* Top Header bar */}
        <header className="h-14 flex items-center justify-between px-6 border-b border-[#f1f1f1] select-none shrink-0">
          <div className="flex items-center gap-1.5 relative" ref={dropdownRef}>
            <button
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-neutral-100 rounded-xl text-neutral-700 font-semibold text-[15px] transition-colors cursor-pointer"
            >
              <span>{selectedModel}</span>
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            </button>

            {isModelDropdownOpen && (
              <div className="absolute top-11 left-0 w-44 bg-white border border-neutral-200/80 rounded-2xl shadow-xl py-2 z-40 animate-in fade-in-50 slide-in-from-top-2 duration-150">
                {['ChatGPT', 'GPT-4o', 'Purple Gemini'].map((model) => (
                  <button
                    key={model}
                    onClick={() => {
                      setSelectedModel(model)
                      setIsModelDropdownOpen(false)
                    }}
                    className={`w-full flex items-center justify-between px-4 py-2 text-left text-sm transition-colors cursor-pointer ${
                      selectedModel === model
                        ? 'bg-neutral-100 text-black font-semibold'
                        : 'text-neutral-600 hover:bg-neutral-50 hover:text-black'
                    }`}
                  >
                    <span>{model}</span>
                    {selectedModel === model && <Sparkles className="w-3.5 h-3.5 text-yellow-500" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer" title="Fullscreen">
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
          {showEmptyState ? (
            /* Centered empty state dashboard matching the screenshot exactly */
            <div className="flex-1 flex flex-col items-center justify-center px-4 max-w-2xl mx-auto w-full pb-10">
              <h1 className="text-3xl font-medium tracking-tight text-neutral-900 text-center mb-8">
                What's on the agenda today?
              </h1>

              <form onSubmit={handleSubmit} className="w-full relative group">
                <div className="w-full bg-[#f4f4f4] hover:bg-[#eaeaea] focus-within:bg-white border border-transparent focus-within:border-neutral-300 rounded-[28px] p-2 flex items-center transition-all duration-300 shadow-[0_4px_16px_rgba(0,0,0,0.02)] focus-within:shadow-[0_4px_24px_rgba(0,0,0,0.06)] min-h-[58px]">
                  
                  {/* Plus attachment icon */}
                  <button
                    type="button"
                    className="p-3 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/50 rounded-full transition-colors shrink-0 cursor-pointer"
                  >
                    <Plus className="w-5 h-5" />
                  </button>

                  {/* Input area */}
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ask anything"
                    className="flex-1 bg-transparent border-none outline-none text-neutral-800 placeholder-neutral-400/90 text-[15px] font-medium px-2.5 h-full focus:ring-0 focus:border-none focus:outline-none"
                    disabled={isStreaming}
                  />

                  {/* Mic action icon */}
                  <button
                    type="button"
                    className="p-3 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/50 rounded-full transition-colors shrink-0 cursor-pointer"
                  >
                    <Mic className="w-5 h-5" />
                  </button>

                  {/* Send waveform bubble */}
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isStreaming}
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer shadow-sm transition-all duration-200 ${
                      inputValue.trim() && !isStreaming
                        ? 'bg-black text-white hover:scale-105 hover:bg-zinc-800'
                        : 'bg-neutral-250 text-neutral-400 cursor-not-allowed'
                    }`}
                  >
                    {isStreaming ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 fill-current" />
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Scrollable Conversation view list */
            <div className="flex-1 overflow-y-auto px-4 py-8 md:px-8 space-y-8 max-w-3xl mx-auto w-full">
              {displayedMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-5 select-text ${
                    msg.role === 'User' ? 'justify-end' : 'justify-start'
                  } animate-in fade-in-60 slide-in-from-bottom-2 duration-300`}
                >
                  {msg.role !== 'User' && (
                    /* Assistant Avatar Icon badge */
                    <div className="w-8.5 h-8.5 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white shrink-0 shadow-sm">
                      <Sparkles className="w-4 h-4 text-white fill-current" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-[15px] shadow-sm leading-relaxed ${
                      msg.role === 'User'
                        ? 'bg-neutral-100/90 text-neutral-800 rounded-tr-none border border-neutral-200/20'
                        : 'bg-white text-neutral-850 rounded-tl-none border border-neutral-100/60 flex-1'
                    }`}
                  >
                    {msg.role === 'User' ? (
                      <div className="whitespace-pre-wrap font-medium">{msg.content}</div>
                    ) : (
                      renderMessageContent(msg.content, index)
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Sticky bottom input area (only visible when not in empty initial dashboard state) */}
        {!showEmptyState && (
          <div className="shrink-0 border-t border-[#f1f1f1]/80 bg-white p-4 max-w-3xl mx-auto w-full z-10">
            <form onSubmit={handleSubmit} className="w-full relative">
              <div className="w-full bg-[#f4f4f4] hover:bg-[#eaeaea] focus-within:bg-white border border-transparent focus-within:border-neutral-300 rounded-[28px] p-2 flex items-center transition-all duration-300 shadow-sm min-h-[54px]">
                
                {/* Plus Attachment icon */}
                <button
                  type="button"
                  className="p-2.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/50 rounded-full transition-colors shrink-0 cursor-pointer"
                >
                  <Plus className="w-4.5 h-4.5" />
                </button>

                {/* Input area */}
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask anything"
                  className="flex-1 bg-transparent border-none outline-none text-neutral-800 placeholder-neutral-450 text-[14px] font-medium px-2 h-full focus:ring-0 focus:border-none focus:outline-none"
                  disabled={isStreaming}
                />

                {/* Mic icon */}
                <button
                  type="button"
                  className="p-2.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/50 rounded-full transition-colors shrink-0 cursor-pointer"
                >
                  <Mic className="w-4.5 h-4.5" />
                </button>

                {/* Send wave button */}
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isStreaming}
                  className={`w-9.5 h-9.5 rounded-full flex items-center justify-center shrink-0 cursor-pointer shadow-sm transition-all duration-200 ${
                    inputValue.trim() && !isStreaming
                      ? 'bg-black text-white hover:scale-105 hover:bg-zinc-800'
                      : 'bg-neutral-250 text-neutral-400 cursor-not-allowed'
                  }`}
                >
                  {isStreaming ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 fill-current" />
                  )}
                </button>
              </div>
            </form>
            <div className="text-[10px] text-center text-neutral-400 mt-2 font-medium">
              Purple City AI can make mistakes. Verify important info.
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default Home