import { Twitter } from 'lucide-react'
import { Button, type ButtonProps } from './ui/button'

/**
 * TwitterShare Component - Version 1.0
 * Just a version of Twitter share that I like
 */

export interface TwitterShareProps extends Omit<ButtonProps, 'onClick'> {
  shareText?: string
  shareUrl?: string
  title?: string
  children?: React.ReactNode
}

export const TwitterShare = ({
  shareText = "OpenShelf helps you keep track of everything you want to read later 🦉",
  shareUrl,
  title = "Share on Twitter/X",
  className,
  variant = 'ghost',
  size = 'sm',
  children,
  ...buttonProps
}: TwitterShareProps) => {
  const handleShare = () => {
    const urlToShare = shareUrl ?? window.location.href
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(urlToShare)}`
    window.open(twitterUrl, '_blank')
  }

  const defaultClasses =
    'text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/30 gap-2 text-xs opacity-75 hover:opacity-100 transition-all duration-200 border border-muted-foreground/30 hover:border-muted-foreground/60'

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleShare}
      className={`${defaultClasses}${className ? ` ${className}` : ''}`}
      title={title}
      {...buttonProps}
    >
      {children ?? (
        <>
          <Twitter size={14} />
          Share
        </>
      )}
    </Button>
  )
}


