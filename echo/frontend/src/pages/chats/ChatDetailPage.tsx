import { useEffect, useState, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Avatar, Button, EmptyState } from '@/shared/ui'
import { fetchChatMessages, fetchChats, uploadChatFile } from '@/shared/api/endpoints'
import { TypingIndicator } from '@/components/TypingIndicator'

import { ApiError } from '@/shared/api/client'
import { useAuthStore } from '@/store/auth'
import { useWebSocket } from '@/shared/lib/useWebSocket'
import type { Chat, ChatMessage } from '@/types/domain'
import { env, ROUTES } from '@/shared/config/env'
import styles from './ChatDetailPage.module.css'

const DEMO_MESSAGES: ChatMessage[] = [
  {
    id: 1,
    text: 'Hi there! Welcome to Echo.',
    sender: 'bob',
    sender_username: 'bob',
    created_at: new Date(Date.now() - 5 * 60_000).toISOString(),
    is_encrypted: true,
  },
  {
    id: 2,
    text: 'Reply by tapping here soon — composer is on the way.',
    sender: 'self',
    sender_username: 'you',
    created_at: new Date(Date.now() - 4 * 60_000).toISOString(),
    is_encrypted: true,
  },
]

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function previewName(chat: Chat, myId: string | number | undefined): string {
  if (chat.name) return chat.name
  const others = chat.participants.filter((p) => String(p) !== String(myId ?? ''))
  return others.length > 0 ? String(others[0]) : String(chat.participants[0] ?? '?')
}

export function ChatDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)
  const myId = user?.id

  const [chat, setChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<ChatMessage[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Composer and attachment states
  const [text, setText] = useState('')
  const [attachments, setAttachments] = useState<Array<{ url: string; name: string; type: string; size: number }>>([])
  const [uploadingFiles, setUploadingFiles] = useState<Array<{ id: string; name: string }>>([])
  const [dragOver, setDragOver] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [peerTyping, setPeerTyping] = useState(false)

  // WebSocket hook
  const { status: wsStatus, send: wsSend } = useWebSocket<any, any>(`/ws/chat/${id}/`, {
    onMessage: (msg) => {
      if (msg.type === 'message' && msg.message) {
        setMessages((prev) => {
          if (!prev) return [msg.message]
          // Deduplicate
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
    setError(null)
    
    fetchChats()
      .then((list) => {
        if (cancelled) return
        const found = list.find((c) => String(c.id) === String(id)) ?? null
        setChat(found)
        return fetchChatMessages(id)
      })
      .catch((e) => {
        if (cancelled) return
        if (!env.apiBaseUrl) {
          setChat(null)
          setMessages(DEMO_MESSAGES)
        } else {
          setError(e instanceof ApiError ? e.message : 'failed to load chat')
        }
      })
      .then((msgs) => {
        if (cancelled || !msgs) return
        setMessages([...msgs].reverse())
      })
    return () => { cancelled = true }
  }, [id])

  const handleUploadFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      alert('File is too large (max 10MB)')
      return
    }

    const uploadId = Math.random().toString(36).substring(2, 9)
    setUploadingFiles((prev) => [...prev, { id: uploadId, name: file.name }])

    try {
      const res = await uploadChatFile(file, id)
      setAttachments((prev) => [
        ...prev,
        {
          url: res.url,
          name: res.filename,
          type: res.type,
          size: res.size,
        },
      ])
    } catch (e: any) {
      alert(e instanceof ApiError ? e.message : 'Failed to upload file')
    } finally {
      setUploadingFiles((prev) => prev.filter((f) => f.id !== uploadId))
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleUploadFile(file)
    }
  }

  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed && attachments.length === 0) return

    let fileType: string | null = null
    if (attachments.length > 0) {
      const first = attachments[0]
      fileType = first.type.startsWith('image/') ? 'image' : 'file'
    }

    const attachmentUrls = attachments.map((a) => a.url)

    if (wsStatus === 'open') {
      wsSend({
        type: 'message',
        text: trimmed,
        attachments: attachmentUrls,
        file_type: fileType,
      })
    } else {
      // Fallback/Mock send when WebSocket is offline
      const mockMsg: ChatMessage = {
        id: Math.random(),
        text: trimmed,
        sender: myId || 'self',
        sender_username: user?.handle || 'you',
        created_at: new Date().toISOString(),
        is_encrypted: false,
        attachments: attachmentUrls,
        file_type: fileType,
      }
      setMessages((prev) => [...(prev || []), mockMsg])
    }

    setText('')
    setAttachments([])
  }

  const title = chat ? previewName(chat, myId) : id

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <Link to={ROUTES.chats} className={styles.back} aria-label="back to chats">←</Link>
        <Avatar handle={title} avatar={chat?.name ? undefined : chat?.participants_data?.find((p: any) => String(p.id) !== String(myId))?.avatar} size="sm" />
        <h1 className={styles.title}>{title}</h1>
      </header>

      {error && (
        <div className="frame" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
          ! {error}
        </div>
      )}

      {messages === null ? (
        <EmptyState glyph="· · ·" title="loading" body="fetching messages" />
      ) : messages.length === 0 ? (
        <EmptyState
          glyph="·   ·   ·"
          title="no messages"
          body="say something — composer is on the way"
        />
      ) : (
        <ul className={styles.thread}>
          {messages.map((m) => {
            const mine = m.sender != null && String(m.sender) === String(myId ?? '')
            return (
              <li
                key={m.id}
                className={mine ? styles.bubbleMine : styles.bubbleTheirs}
                data-mine={mine ? 'true' : 'false'}
              >
                <div className={styles.bubbleText}>{m.text}</div>
                
                {m.attachments && m.attachments.length > 0 && (
                  <div className={styles.bubbleAttachments}>
                    {m.file_type === 'image' ? (
                      m.attachments.map((url, idx) => (
                        <div key={idx} className={styles.imageAttachment}>
                          <img src={url} alt="Attachment" className={styles.attachedImg} />
                        </div>
                      ))
                    ) : (
                      m.attachments.map((url, idx) => {
                        const filename = url.split('/').pop() || 'file'
                        return (
                          <a
                            key={idx}
                            href={url}
                            download
                            target="_blank"
                            rel="noreferrer"
                            className={styles.fileAttachment}
                          >
                            <span className={styles.fileIcon}>📄</span>
                            <span className={styles.fileName}>{filename}</span>
                          </a>
                        )
                      })
                    )}
                  </div>
                )}

                <div className={styles.bubbleMeta}>
                  <span className={styles.sender}>
                    {mine ? 'you' : (m.sender_username ?? 'peer')}
                  </span>
                  <span className={styles.dot} aria-hidden>·</span>
                  <span>{formatTime(m.created_at)}</span>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {peerTyping && <TypingIndicator typing={true} />}
      <footer
        className={styles.composerContainer}
        data-drag={dragOver ? 'true' : 'false'}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {attachments.length > 0 && (
          <div className={styles.attachmentsPreview}>
            {attachments.map((a, idx) => (
              <div key={idx} className={styles.previewItem}>
                <span>
                  {a.type.startsWith('image/') ? '🖼️' : '📄'} {a.name}
                </span>
                <button
                  type="button"
                  onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                  className={styles.previewClose}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {uploadingFiles.map((f) => (
          <div key={f.id} className={styles.uploadingItem}>
            <span>🔄 uploading: {f.name}...</span>
          </div>
        ))}

        <div className={styles.composerRow}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleUploadFile(file)
            }}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={triggerFileSelect}
            className={styles.attachButton}
            title="Attach file"
          >
            📎
          </button>
          
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              // Send typing indicator
              if (wsStatus === 'open') {
                wsSend({ type: 'typing', isTyping: e.target.value.length > 0 })
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Type a message or drop files here..."
            className={styles.inputArea}
            rows={1}
          />
          
          <Button
            variant="primary"
            onClick={handleSend}
            disabled={!text.trim() && attachments.length === 0}
            className={styles.sendButton}
            prefix=">"
          >
            send
          </Button>
        </div>
      </footer>

      <div className={styles.wsStatusIndicator}>
        <span className={styles.wsDot} data-state={wsStatus} />
        ws: {wsStatus}
      </div>
    </div>
  )
}
