import { TwitterShare } from './TwitterShare'

export function Navbar() {
  return (
    <header className="bg-background py-4">
      <div className="container mx-auto px-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4 flex-shrink-0">
            <img 
              src="/nookio-side.png" 
              alt="OpenShelf" 
              className="h-16 w-auto md:h-24"
            />
            <h1 className="text-4xl md:text-6xl text-foreground" style={{ fontFamily: 'Markazi Text', fontWeight: 600 }}>
              OpenShelf
            </h1>
          </div>
          <div
            id="openshelf-header-status-filters"
            className="flex w-full items-center justify-center lg:flex-1"
          />
          <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
            <TwitterShare />
            <div
              id="openshelf-header-actions"
              className="relative flex flex-wrap items-center justify-end gap-2"
            />
          </div>
        </div>
        <div
          id="openshelf-header-panels"
          className="mt-3 w-full"
        />
      </div>
    </header>
  )
} 