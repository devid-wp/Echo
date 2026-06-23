import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { Avatar, Button, Field, TextArea } from '@/shared/ui'
import { updateProfile, uploadAvatar, deleteAvatar } from '@/shared/api/endpoints'
import { ApiError } from '@/shared/api/client'
import { ROUTES } from '@/shared/config/env'
import styles from './EditProfilePage.module.css'

export function EditProfilePage() {
  const me = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState('')
  const [handle, setHandle] = useState('')
  const [email, setEmail] = useState('')
  const [bio, setBio] = useState('')
  const [avatar, setAvatar] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize values
  useEffect(() => {
    if (me) {
      setDisplayName(me.displayName || '')
      setHandle(me.handle || '')
      // email is in raw state or mock user, let's fall back
      setEmail((me as any).email || '')
      setBio(me.bio || '')
      setAvatar(me.avatar || null)
    }
  }, [me])

  if (!me) {
    return <div className="frame">! unauthorized</div>
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)
    try {
      const res = await uploadAvatar(file)
      setAvatar(res.avatar)
      // Update store immediately
      setUser({ ...me, avatar: res.avatar })
    } catch (e: any) {
      setError(e instanceof ApiError ? e.message : 'failed to upload avatar')
    } finally {
      setUploading(false)
    }
  }

  const handleAvatarDelete = async () => {
    setUploading(true)
    setError(null)
    try {
      await deleteAvatar()
      setAvatar(null)
      // Update store immediately
      setUser({ ...me, avatar: null })
    } catch (e: any) {
      setError(e instanceof ApiError ? e.message : 'failed to delete avatar')
    } finally {
      setUploading(false)
    }
  }

  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setFieldErrors({})

    const payload = {
      displayName: displayName.trim(),
      handle: handle.trim(),
      email: email.trim(),
      bio: bio.trim(),
    }

    try {
      const updatedUser = await updateProfile(payload)
      setUser(updatedUser)
      navigate(ROUTES.profile(updatedUser.id))
    } catch (e: any) {
      if (e instanceof ApiError) {
        if (e.code === 'handle_taken' || e.message.includes('Handle already taken') || e.message.includes('username already exists') || e.message.includes('unique constraint')) {
          setFieldErrors({ handle: 'this handle is already taken' })
        } else if (e.code === 'email_taken' || e.message.includes('Email already taken')) {
          setFieldErrors({ email: 'this email is already taken' })
        } else {
          setError(e.message)
        }
      } else {
        setError('failed to save changes')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.head}>
        <Button variant="ghost" onClick={() => navigate(ROUTES.profile(me.id))} prefix="←">
          cancel
        </Button>
        <h1 className={styles.title}>edit profile</h1>
      </header>

      {error && (
        <div className="frame" style={{ borderColor: 'var(--danger)', color: 'var(--danger)', marginBottom: 'var(--s-4)' }}>
          ! {error}
        </div>
      )}

      <form onSubmit={handleSave} className={styles.form}>
        <div className={styles.avatarSection}>
          <Avatar handle={handle || me.handle} avatar={avatar} size="xl" />
          <div className={styles.avatarActions}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              style={{ display: 'none' }}
            />
            <Button
              type="button"
              variant="primary"
              onClick={triggerFileSelect}
              loading={uploading}
              size="sm"
            >
              upload new image
            </Button>
            {avatar && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleAvatarDelete}
                loading={uploading}
                size="sm"
              >
                remove
              </Button>
            )}
          </div>
        </div>

        <div className={styles.fields}>
          <Field
            label="display name"
            required
            inputProps={{
              value: displayName,
              onChange: (e) => setDisplayName(e.target.value),
              placeholder: 'Your Name',
            }}
          />

          <Field
            label="username / handle"
            required
            error={fieldErrors.handle}
            prompt="@"
            inputProps={{
              value: handle,
              onChange: (e) => setHandle(e.target.value),
              placeholder: 'handle',
            }}
          />

          <Field
            label="email"
            required
            error={fieldErrors.email}
            inputProps={{
              type: 'email',
              value: email,
              onChange: (e) => setEmail(e.target.value),
              placeholder: 'email@echo.dev',
            }}
          />

          <TextArea
            label="bio"
            textareaProps={{
              value: bio,
              onChange: (e) => setBio(e.target.value),
              placeholder: 'Write something about yourself...',
              rows: 4,
            }}
          />
        </div>

        <div className={styles.formActions}>
          <Button type="submit" variant="primary" loading={saving} prefix=">">
            save changes
          </Button>
        </div>
      </form>
    </div>
  )
}
