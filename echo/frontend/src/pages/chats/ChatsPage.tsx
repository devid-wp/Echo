import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Avatar, Button } from '@/shared/ui'
import {
  fetchChats,
  fetchUsers,
  createGroup,
  fetchChatMessages,
  uploadChatFile,
} from '@/shared/api/endpoints'
import { ApiError } from '@/shared/api/client'
import { useAuthStore } from '@/store/auth'
import { useWebSocket } from '@/shared/lib/useWebSocket'
import { TypingIndicator } from '@/components/TypingIndicator'
import type { Chat, ChatMessage, User } from '@/types/domain'
import { ROUTES } from '@/shared/config/env'
import styles from './ChatsPage.module.css'

/* ── helpers ── */
function timeAgo(iso?: string): string {
  if (!iso) return ''
  const d = Date.now() - new Date(iso).getTime()
  if (d < 60_000) return 'now'
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m`
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h`
  return `${Math.floor(d / 86_400_000)}d`
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

function chatTitle(chat: Chat, myId: string | undefined): string {
  if (chat.name) return chat.name
  const others = chat.participants.filter((p) => String(p) !== String(myId ?? ''))
  // Try to get display name from participants_data
  if (chat.participants_data && others.length > 0) {
    const found = (chat.participants_data as any[]).find(
      (p: any) => String(p.id ?? p) === String(others[0])
    )
    if (found) return found.username || found.displayName || found.first_name || String(others[0])
  }
  return others.length > 0 ? String(others[0]) : String(chat.participants[0] ?? '?')
}

/* ── Sidebar ── */
interface SidebarProps {
  chats: Chat[] | null
  activeChatId: string | undefined
  myId: string | undefined
  onSelect: (id: string) => void
  onNewGroup: () => void
}

function ChatSidebar({ chats, activeChatId, myId, onSelect, onNewGroup }: SidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHead}>
        <div className={styles.sidebarCmd}>$ tail -f /chats</div>
        <div className={styles.sidebarSub}>
          chats // {chats?.length ?? '—'} active
        </div>
      </div>

      <ul className={styles.chatList}>
        {chats === null && (
          <li className={styles.sidebarEmpty}>· · · loading</li>
        )}
        {chats?.length === 0 && (
          <li className={styles.sidebarEmpty}>
            no conversations yet.<br />start one from a profile.
          </li>
        )}
        {chats?.map((chat) => {
          const title = chatTitle(chat, myId)
          const preview = chat.last_message?.text ?? 'no messages yet'
          const ago = timeAgo(chat.last_message?.created_at ?? chat.updated_at)
          const unread = chat.unread_count ?? 0
          const isActive = String(chat.id) === String(activeChatId ?? '')
          return (
            <li key={chat.id}>
              <a
                className={`${styles.chatItem} ${isActive ? styles.active : ''}`}
                href="#"
                aria-label={`open chat with ${title}`}
                onClick={(e) => { e.preventDefault(); onSelect(String(chat.id)) }}
              >
                <div className={styles.chatItemTop}>
                  <span className={styles.chatName}>{title}</span>
                  {ago && <span className={styles.chatTime}>{ago}</span>}
                </div>
                <div className={styles.chatPreview}>
                  <span className={styles.chatPreviewText}>{preview}</span>
                  {unread > 0 && (
                    <span className={styles.chatBadge}>{unread}</span>
                  )}
                </div>
              </a>
            </li>
          )
        })}
      </ul>

      <div className={styles.sidebarActions}>
        <Button
          variant="ghost"
          onClick={onNewGroup}
          prefix="+"
          className={styles.newGroupBtn}
          size="sm"
        >
          create group
        </Button>
      </div>
    </aside>
  )
}

/* ── Chat panel ── */
interface ChatPanelProps {
  chatId: string
  chat: Chat | undefined
  myId: string | undefined
  myHandle: string | undefined
}

function ChatPanel({ chatId, chat, myId, myHandle }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[] | null>(null)
  const [text, setText] = useState('')
  const [attachments, setAttachments] = useState<Array<{ url: string; name: string; type: string; size: number }>>([])
  const [uploadingFiles, setUploadingFiles] = useState<Array<{ id: string; name: string }>>([])
  const [dragOver, setDragOver] = useState(false)
  const [peerTyping, setPeerTyping] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLLIElement>(null)

  const { status: wsStatus, send: wsSend } = useWebSocket<any, any>(`/ws/chat/${chatId}/`, {
    onMessage: (msg) => {
      if (msg.type === 'message' && msg.message) {
        setMessages((prev) => {
          if (!prev) return [msg.message]
          if (prev.some((m) => String(m.id) === String(msg.message.id))) return prev
          return [...prev, msg.message]
        })
      } else if (msg.type === 'chat_history' && msg.messages) {
        setMessages([...msg.messages].reverse())
      } else if (msg.type === 'typing' && typeof msg.isTyping === 'boolean') {
        setPeerTyping(msg.isTyping)
      }
    },
  })

  useEffect(() => {
    let cancelled = false
    setMessages(null)
    setText('')
    setAttachments([])
    fetchChatMessages(chatId)
      .then((msgs) => { if (!cancelled) setMessages([...msgs].reverse()) })
      .catch(() => { if (!cancelled) setMessages([]) })
    return () => { cancelled = true }
  }, [chatId])

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const title = chat ? chatTitle(chat, myId) : chatId

  const handleUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) { alert('File too large (max 10MB)'); return }
    const uid = Math.random().toString(36).slice(2, 9)
    setUploadingFiles((p) => [...p, { id: uid, name: file.name }])
    try {
      const res = await uploadChatFile(file, chatId)
      setAttachments((p) => [...p, { url: res.url, name: res.filename, type: res.type, size: res.size }])
    } catch (e: any) {
      alert(e instanceof ApiError ? e.message : 'Upload failed')
    } finally {
      setUploadingFiles((p) => p.filter((f) => f.id !== uid))
    }
  }

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed && attachments.length === 0) return
    const attachUrls = attachments.map((a) => a.url)
    const fileType = attachments[0]?.type.startsWith('image/') ? 'image' : attachments.length > 0 ? 'file' : null

    if (wsStatus === 'open') {
      wsSend({ type: 'message', text: trimmed, attachments: attachUrls, file_type: fileType })
    } else {
      setMessages((prev) => [...(prev || []), {
        id: Math.random(),
        text: trimmed,
        sender: myId || 'self',
        sender_username: myHandle || 'you',
        created_at: new Date().toISOString(),
        is_encrypted: false,
        attachments: attachUrls,
        file_type: fileType,
      }])
    }
    setText('')
    setAttachments([])
  }

  return (
    <>
      {/* Head */}
      <div className={styles.chatHead}>
        <span className={styles.chatHeadCmd}>$ tail -f /chat/{title}</span>
        <div className={styles.chatHeadStatus}>
          <span className={styles.wsDot} data-state={wsStatus} />
          ws: {wsStatus}
        </div>
      </div>

      {/* Thread */}
      <ul
        className={styles.thread}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleUpload(f) }}
        style={dragOver ? { borderColor: 'var(--accent)' } : {}}
      >
        {messages === null && <li style={{ color: 'var(--fg-mute)', fontSize: 12 }}>· · · loading</li>}
        {messages?.length === 0 && <li style={{ color: 'var(--fg-mute)', fontSize: 12 }}>no messages yet. say something.</li>}
        {messages?.map((m) => {
          const mine = m.sender != null && String(m.sender) === String(myId ?? '')
          return (
            <li key={m.id} className={mine ? styles.bubbleMine : styles.bubbleTheirs}>
              <div className={styles.bubbleText}>{m.text}</div>
              {m.attachments && m.attachments.length > 0 && (
                <div className={styles.bubbleAttachments}>
                  {m.file_type === 'image'
                    ? m.attachments.map((url, i) => (
                        <img key={i} src={url} alt="attachment" className={styles.attachedImg} />
                      ))
                    : m.attachments.map((url, i) => {
                        const name = url.split('/').pop() || 'file'
                        return (
                          <a key={i} href={url} download target="_blank" rel="noreferrer" className={styles.fileAttachment}>
                            [file] {name}
                          </a>
                        )
                      })}
                </div>
              )}
              <div className={styles.bubbleMeta}>
                {mine ? `@${myHandle ?? 'you'}` : `@${m.sender_username ?? 'peer'}`}
                {' · '}
                {formatTime(m.created_at)}
              </div>
            </li>
          )
        })}
        {peerTyping && (
          <li><TypingIndicator typing={true} /></li>
        )}
        <li ref={bottomRef} />
      </ul>

      {/* Composer */}
      <div className={styles.composer}>
        {(attachments.length > 0 || uploadingFiles.length > 0) && (
          <div className={styles.attachPreviewBar}>
            {attachments.map((a, i) => (
              <div key={i} className={styles.attachPreviewItem}>
                {a.type.startsWith('image/') ? '[img]' : '[file]'} {a.name}
                <button
                  type="button"
                  className={styles.attachPreviewClose}
                  onClick={() => setAttachments((p) => p.filter((_, idx) => idx !== i))}
                >×</button>
              </div>
            ))}
            {uploadingFiles.map((f) => (
              <div key={f.id} className={styles.uploadingLabel}>uploading {f.name}▌</div>
            ))}
          </div>
        )}

        <div className={styles.composerRow}>
          <span className={styles.composerPrompt}>&gt;</span>
          <textarea
            className={styles.composerInput}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              if (wsStatus === 'open') wsSend({ type: 'typing', isTyping: e.target.value.length > 0 })
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
            }}
            placeholder="type a message..."
            rows={1}
          />
        </div>

        <div className={styles.composerActions}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f) }}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className={styles.attachBtn}
              onClick={() => fileInputRef.current?.click()}
              title="attach file"
            >
              [+]
            </button>
            <span className={styles.composerTo}>
              to <span className={styles.composerToAccent}>@{title}</span>
            </span>
          </div>
          <Button
            variant="primary"
            onClick={handleSend}
            disabled={!text.trim() && attachments.length === 0}
            className={styles.sendBtn}
            prefix=">"
            size="sm"
          >
            send
          </Button>
        </div>
      </div>
    </>
  )
}

/* ── Group modal ── */
interface GroupModalProps {
  allUsers: User[]
  onClose: () => void
  onCreated: (chat: Chat) => void
}

function GroupModal({ allUsers, onClose, onCreated }: GroupModalProps) {
  const [name, setName] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [creating, setCreating] = useState(false)

  const toggle = (id: string) =>
    setSelected((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])

  const handleCreate = async () => {
    if (!name.trim() || selected.length === 0) return
    setCreating(true)
    try {
      const chat = await createGroup(name.trim(), selected)
      onCreated(chat)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.modalTitle}>create group</h2>
        <div>
          <label className={styles.modalLabel}>group name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={styles.modalInput}
            placeholder="team-alpha"
          />
        </div>
        <div>
          <label className={styles.modalLabel}>select participants</label>
          <div className={styles.usersList}>
            {allUsers.length === 0 && (
              <div style={{ padding: '8px', color: 'var(--fg-mute)', fontSize: 12 }}>
                no other users found
              </div>
            )}
            {allUsers.map((u) => (
              <label key={u.id} className={styles.userRow}>
                <input
                  type="checkbox"
                  checked={selected.includes(u.id)}
                  onChange={() => toggle(u.id)}
                />
                <Avatar handle={u.handle} avatar={u.avatar} size="sm" />
                <span>@{u.handle} — {u.displayName}</span>
              </label>
            ))}
          </div>
        </div>
        <div className={styles.modalActions}>
          <Button variant="ghost" onClick={onClose} disabled={creating}>cancel</Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            loading={creating}
            disabled={!name.trim() || selected.length === 0}
            prefix=">"
          >
            create
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ── Main page ── */
export function ChatsPage() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const { id: routeId } = useParams<{ id?: string }>()

  const [chats, setChats] = useState<Chat[] | null>(null)
  const [activeChatId, setActiveChatId] = useState<string | undefined>(routeId)
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    fetchChats()
      .then(setChats)
      .catch(() => setChats([]))
  }, [])

  useEffect(() => {
    if (modalOpen) {
      fetchUsers().then(setAllUsers).catch(() => {})
    }
  }, [modalOpen])

  // Sync URL → active chat
  useEffect(() => {
    if (routeId) setActiveChatId(routeId)
  }, [routeId])

  const handleSelect = (id: string) => {
    setActiveChatId(id)
    navigate(ROUTES.chatDetail(id), { replace: true })
  }

  const activeChat = chats?.find((c) => String(c.id) === String(activeChatId ?? ''))

  return (
    <div className={styles.shell}>
      <ChatSidebar
        chats={chats}
        activeChatId={activeChatId}
        myId={user?.id}
        onSelect={handleSelect}
        onNewGroup={() => setModalOpen(true)}
      />

      <div className={styles.chatPanel}>
        {activeChatId ? (
          <ChatPanel
            key={activeChatId}
            chatId={activeChatId}
            chat={activeChat}
            myId={user?.id}
            myHandle={user?.handle}
          />
        ) : (
          <div className={styles.noChat}>
            <div className={styles.noChatGlyph}>· · ·</div>
            <div className={styles.noChatText}>select a conversation</div>
          </div>
        )}
      </div>

      {modalOpen && (
        <GroupModal
          allUsers={allUsers}
          onClose={() => setModalOpen(false)}
          onCreated={(chat) => {
            setChats((prev) => (prev ? [...prev, chat] : [chat]))
            setModalOpen(false)
            handleSelect(String(chat.id))
          }}
        />
      )}
    </div>
  )
}
