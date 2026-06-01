import { isDefaultDisplayName } from '../lib/branding'

interface NavbarProps {
  displayName: string
  logoSrc: string
}

export function Navbar({ displayName, logoSrc }: NavbarProps) {
  const showByline = !isDefaultDisplayName(displayName)
  return (
    <header className="bg-background py-3 lg:py-4">
      <div className="container mx-auto px-3 lg:px-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 lg:flex lg:flex-nowrap lg:items-center lg:gap-4">
          <div className="flex min-w-0 items-center gap-2 lg:gap-4">
            <img
              src={logoSrc}
              alt={displayName}
              className="h-10 w-auto shrink-0 md:h-16 lg:h-24"
            />
            <div className="min-w-0">
              <h1
                className="truncate text-2xl text-foreground md:text-4xl lg:text-6xl"
                style={{ fontFamily: 'Markazi Text', fontWeight: 600 }}
              >
                {displayName}
              </h1>
              {showByline ? (
                <p className="text-xs text-muted-foreground md:text-sm">by OpenShelf</p>
              ) : null}
            </div>
          </div>
          <div
            id="openshelf-header-status-filters"
            className="flex shrink-0 items-center justify-end lg:flex-1 lg:justify-center"
          />
          <div
            id="openshelf-header-actions"
            className="relative col-span-2 flex flex-wrap items-center justify-end gap-2 lg:col-span-1 lg:ml-auto lg:gap-3"
          />
        </div>
        <div
          id="openshelf-header-panels"
          className="mt-3 w-full"
        />
      </div>
    </header>
  )
}
