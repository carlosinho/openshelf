import { useState } from 'react'
import { AlertCircle, LockKeyhole } from 'lucide-react'
import { Button } from './ui/button'

interface LoginFormProps {
  onSubmit: (password: string) => Promise<void>
  error?: string | null
}

export function LoginForm({ onSubmit, error }: LoginFormProps) {
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!password.trim()) {
      return
    }

    setIsSubmitting(true)

    try {
      await onSubmit(password)
      setPassword('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-md space-y-4 rounded-lg border bg-card p-6 shadow-sm">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full border bg-muted">
          <LockKeyhole className="size-5 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-semibold">Unlock OpenShelf</h2>
        <p className="text-sm text-muted-foreground">
          Enter the instance password configured on this server to access your saved links.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder="Enter password"
          autoFocus
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting || !password.trim()}>
        {isSubmitting ? 'Unlocking...' : 'Unlock'}
      </Button>
    </form>
  )
}
