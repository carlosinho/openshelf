export function Navbar() {
  return (
    <header className="bg-background py-3 lg:py-4">
      <div className="container mx-auto px-3 lg:px-4">
        <div className="flex flex-wrap items-center gap-3 lg:flex-nowrap lg:gap-4">
          <div className="flex flex-shrink-0 items-center gap-2 lg:gap-4">
            <img
              src="/nookio-side.png"
              alt="OpenShelf"
              className="h-10 w-auto md:h-16 lg:h-24"
            />
            <h1
              className="text-2xl text-foreground md:text-4xl lg:text-6xl"
              style={{ fontFamily: 'Markazi Text', fontWeight: 600 }}
            >
              OpenShelf
            </h1>
          </div>
          <div
            id="openshelf-header-status-filters"
            className="ml-auto flex items-center justify-end lg:flex-1 lg:justify-center"
          />
          <div
            id="openshelf-header-actions"
            className="relative flex w-full flex-wrap items-center justify-end gap-2 lg:ml-auto lg:w-auto lg:gap-3"
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
