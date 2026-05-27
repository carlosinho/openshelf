import { Github } from 'lucide-react'

const GITHUB_REPO_URL = 'https://github.com/carlosinho/openshelf'
const AUTHOR_URL = 'https://karol.cc/'
const TWITTER_URL = 'https://x.com/iamkarolk'

export interface AppFooterProps {
  version: string
  className?: string
}

export function AppFooter({ version, className = '' }: AppFooterProps) {
  const linkClassName =
    'font-medium text-muted-foreground transition-colors hover:text-foreground'

  return (
    <footer
      className={`mt-16 border-t border-gray-200 bg-white/80 backdrop-blur-sm ${className}`}
    >
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-muted-foreground md:justify-start">
            <span>{version}</span>
            <span aria-hidden="true">·</span>
            <span>© {new Date().getFullYear()} OpenShelf contributors</span>
            <span aria-hidden="true">·</span>
            <a href={AUTHOR_URL} target="_blank" rel="noopener" className={linkClassName}>
              Karol K
            </a>
            <a href={TWITTER_URL} target="_blank" rel="noopener" className={linkClassName}>
              (Twitter/X)
            </a>
          </div>

          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener"
            className={`flex items-center gap-2 text-sm ${linkClassName}`}
          >
            <Github className="size-4" aria-hidden="true" />
            GitHub
          </a>
        </div>
      </div>
    </footer>
  )
}
