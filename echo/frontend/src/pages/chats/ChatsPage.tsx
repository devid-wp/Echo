import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Avatar, Button, EmptyState } from '@/shared/ui'
import { fetchChats, fetchUsers, createGroup } from '@/shared/api/endpoints'
import { ApiError } from '@/shared/api/client'
import { useAuthStore } from '@/store/auth'
import type { Chat, User } from '@/types/domain'
import { env, ROUTES } from '@/shared/config/env'
import styles from './ChatsPage.module.css'

// Local fallback used only when the backend isn't reachable in dev.
// Matches the seeded data so the page never looks broken.
const DEMO_CHAT: Chat = {
  id: 'demo',
  type: 'private',
  name: null,
  participants: ['self', 'bob'],
  last_message: {
    id: 0,
    text: 'Hi there! Welcome to Echo.',
    sender: 'bob',
    sender_username: 'bob',
    created_at: new Date().toISOString(),
  },
  unread_count: 0,
}

function previewName(chat: Chat, myId: string | number | undefined): string {
  if (chat.name) return chat.name
  // Private chats have 2 participants; show the one that isn't me.
  const others = chat.participants.filter((p) => String(p) !== String(myId ?? ''))
  return others.length > 0 ? String(others[0]) : String(chat.participants[0] ?? '?')
}

function timeAgo(iso?: string): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`
  return `${Math.floor(diff / 86_400_000)}d`
}

export function ChatsPage() {
  const user = useAuthStore((s) => s.user)
  const myId = user?.id
  const navigate = useNavigate()
  const [chats, setChats] = useState<Chat[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Group creation state
  const [modalOpen, setModalOpen] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [creatingGroup, setCreatingGroup] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchChats()
      .then((list) => { if (!cancelled) { setChats(list); setError(null) } })
      .catch((e) => {
        if (cancelled) return
        // If the API isn't configured, fall back to a single demo card so
        // the layout is visible during UI work.
        if (!env.apiBaseUrl) {
          setChats([DEMO_CHAT])
        } else {
          setError(e instanceof ApiError ? e.message : 'failed to load chats')
          setChats([])
        }
      })
    return () => { cancelled = true }
  }, [])

  // Load all users when modal opens
  useEffect(() => {
    if (modalOpen) {
      fetchUsers()
        .then((list) => {
          setAllUsers(list)
        })
        .catch((e) => {
          console.error('failed to load users', e)
        })
    }
  }, [modalOpen])

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) return
    setCreatingGroup(true)
    try {
      const newChat = await createGroup(groupName.trim(), selectedUsers)
      setModalOpen(false)
      setGroupName('')
      setSelectedUsers([])
      navigate(ROUTES.chatDetail(newChat.id))
    } catch (e: any) {
      setError(e instanceof ApiError ? e.message : 'failed to create group')
    } finally {
      setCreatingGroup(false)
    }
  }

  return (
    <div>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>chats</h1>
          <p className={styles.subtitle}>// {chats?.length ?? '—'} conversations</p>
        </div>
        <Button
          variant="primary"
          onClick={() => setModalOpen(true)}
          className={styles.createBtn}
          prefix="+"
        >
          create group
        </Button>
      </header>

      {error && (
        <div className="frame" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
          ! {error}
        </div>
      )}

      {chats === null ? (
        <EmptyState glyph="· · ·" title="loading" body="fetching conversations" />
      ) : chats.length === 0 ? (
        <EmptyState
          glyph="·   ·   ·"
          title="no chats yet"
          body="start a conversation from a user's profile"
        />
      ) : (
        <ul className={styles.list}>
          {chats.map((chat) => {
            const title = previewName(chat, myId)
            const preview = chat.last_message?.text ?? 'no messages yet'
            const ago = timeAgo(chat.last_message?.created_at ?? chat.updated_at)
            const unread = chat.unread_count ?? 0
            return (
              <li key={chat.id}>
                <Link to={ROUTES.chatDetail(chat.id)} className={styles.row} aria-label={`open chat with ${title}`}>
                  <Avatar handle={title} size="md" />
                  <div className={styles.body}>
                    <div className={styles.line1}>
                      <span className={styles.name}>{title}</span>
                      {ago && <span className={styles.time}>{ago}</span>}
                    </div>
                    <div className={styles.line2}>
                      <span className={styles.preview}>{preview}</span>
                      {unread > 0 && (
                        <span className={styles.badge} aria-label={`${unread} unread`}>
                          {unread}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {modalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>create group</h2>
            <div className={styles.modalForm}>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>group name</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className={styles.modalInput}
                  placeholder="Enter group name..."
                  required
                />
              </div>

              <div className={styles.modalField}>
                <label className={styles.modalLabel}>select participants</label>
                <div className={styles.usersList}>
                  {allUsers.length === 0 ? (
                    <div className={styles.emptyUsers}>No other users available</div>
                  ) : (
                    allUsers.map((u) => (
                      <label key={u.id} className={styles.userRow}>
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(u.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers((prev) => [...prev, u.id])
                            } else {
                              setSelectedUsers((prev) => prev.filter((id) => id !== u.id))
                            }
                          }}
                          className={styles.checkbox}
                        />
                        <Avatar handle={u.handle} avatar={u.avatar} size="sm" />
                        <span className={styles.userInfo}>
                          {u.displayName} (@{u.handle})
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className={styles.modalActions}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setModalOpen(false)
                    setGroupName('')
                    setSelectedUsers([])
                  }}
                  disabled={creatingGroup}
                >
                  cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleCreateGroup}
                  loading={creatingGroup}
                  disabled={!groupName.trim() || selectedUsers.length === 0}
                  prefix=">"
                >
                  create
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
