import { ExternalLink, Github, Twitter } from 'lucide-react'
import { PLATFORM_OPTIONS, type SupportedPlatform } from '../../lib/platforms'
import { cn } from '../../lib/utils'
import { PocketItem } from '../../types/pocket'

export function RedditIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(className, 'size-4')}
      aria-hidden="true"
    >
      <circle cx="12" cy="13.25" r="6.25" />
      <circle cx="9.4" cy="12.4" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="14.6" cy="12.4" r="1.05" fill="currentColor" stroke="none" />
      <path d="M9.6 15.55c.8.78 1.82 1.2 2.4 1.2.58 0 1.6-.42 2.4-1.2" />
      <path d="M13.9 7.35 15.3 4.55l2.75.6" />
      <circle cx="18.55" cy="5.55" r="1.45" />
      <path d="M17.55 9.5c.72.28 1.34.78 1.78 1.43" />
      <path d="M4.8 10.95c.45-.76 1.1-1.35 1.87-1.67" />
    </svg>
  )
}

export function PlatformIcon({
  platform,
  className,
}: {
  platform: SupportedPlatform | null
  className?: string
}) {
  switch (platform) {
    case 'twitter':
      return <Twitter className={cn('size-3.5 flex-shrink-0 text-current', className)} aria-hidden="true" />
    case 'reddit':
      return <RedditIcon className={cn('size-3.5 flex-shrink-0 text-current', className)} />
    case 'github':
      return <Github className={cn('size-3.5 flex-shrink-0 text-current', className)} aria-hidden="true" />
    default:
      return <ExternalLink className={cn('size-3.5 flex-shrink-0 text-current', className)} aria-hidden="true" />
  }
}

export function PlatformBadge({ platform }: { platform: SupportedPlatform | null }) {
  if (!platform) {
    return null
  }

  const platformLabel =
    PLATFORM_OPTIONS.find((option) => option.key === platform)?.label ?? 'Platform'

  return (
    <div
      className="flex size-5 items-center justify-center rounded text-muted-foreground"
      title={platformLabel}
    >
      <PlatformIcon platform={platform} />
    </div>
  )
}

export function StatusBadge({ status }: { status: PocketItem['status'] }) {
  const styles = {
    unread: 'bg-amber-400/20 text-amber-600',
    archive: 'bg-blue-400/20 text-blue-600',
  }[status]

  const letter = status === 'unread' ? 'U' : 'A'

  return (
    <div
      className={cn(
        'flex size-5 items-center justify-center rounded text-xs font-medium',
        styles
      )}
    >
      {letter}
    </div>
  )
}

export function ValidationBadge({
  validationStatus,
}: {
  validationStatus?: PocketItem['validation_status']
}) {
  if (
    !validationStatus ||
    validationStatus === 'valid' ||
    validationStatus === 'pending' ||
    validationStatus === 'checking'
  ) {
    return null
  }

  if (validationStatus === 'problem') {
    return (
      <div
        className={cn(
          'flex size-5 items-center justify-center rounded text-xs font-medium',
          'bg-red-400/20 text-red-600'
        )}
        title="X - problem resolving"
      >
        X
      </div>
    )
  }

  return null
}
