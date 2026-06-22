import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Avatar, EmptyState } from '@/shared/ui'
import { fetchChatMessages, fetchChats } from '@/shared/api/endpoints'
import { ApiError } from '@/shared/api/client'
import { useAuthStore } from '@/store/auth'
import type { Chat, ChatMessage } from '@/types/domain'
import { env, ROUTES } from '@/shared/config/env'
import styles from './ChatDetailPage.module.css'

const DEMO_MESSAGES: ChatMessage[] = [
  {
    id: 1,
    text: 'Hi there! Welcome to Echo.',
    sender: 'bob',
    senderUsername: 'bob',
    createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    isEncrypted: true,
  },
  {
    id: 2,
    text: 'Reply by tapping here soon — composer is on the way.',
    sender: 'self',
    senderUsername: 'you',
    createdAt: new Date(Date.now() - 4 * 60_000).toISOString(),
    isEncrypted: true,
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

  useEffect(() => {
    let cancelled = false
    setMessages(null)
    setError(null)
    // Look up the chat in the list cache so we can show the other party's
    // name. If we can't (no list yet, demo mode), fall back to the raw id.
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
        // Backend returns newest-first; reverse for chronological display.
        setMessages([...msgs].reverse())
      })
    return () => { cancelled = true }
  }, [id])

  const title = chat ? previewName(chat, myId) : id

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <Link to={ROUTES.chats} className={styles.back} aria-label="back to chats">←</Link>
        <Avatar handle={title} size="sm" />
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
                <div className={styles.bubbleMeta}>
                  <span className={styles.sender}>
                    {mine ? 'you' : (m.senderUsername ?? 'peer')}
                  </span>
                  <span className={styles.dot} aria-hidden>·</span>
                  <span>{formatTime(m.createdAt)}</span>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <footer className={styles.composerStub} aria-hidden>
        composer · coming soon
      </footer>
    </div>
  )
}
