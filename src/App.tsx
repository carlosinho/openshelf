import { useEffect, useState } from 'react'
import { DataDisplay } from './components/DataDisplay'
import { Navbar } from './components/Navbar'
import { AppFooter } from './components/AppFooter'
import { LoginForm } from './components/LoginForm'
import { PocketItem, Shelf } from './types/pocket'
import { Database, Download, ExternalLink } from 'lucide-react'
import { Button } from './components/ui/button'
import { ApiError, checkAuth, fetchItems, fetchPersonalization, fetchShelves, login, logout } from './lib/api'
import { applyBrandingToDocument, DEFAULT_DISPLAY_NAME, getLogoSrc } from './lib/branding'
import type { PersonalizationSettings } from './types/settings'
import packageJson from '../package.json'

const DEFAULT_PERSONALIZATION: PersonalizationSettings = {
  display_name: DEFAULT_DISPLAY_NAME,
  has_custom_logo: false,
  logo_updated_at: null,
}

function App() {
  const [data, setData] = useState<PocketItem[]>([])
  const [shelves, setShelves] = useState<Shelf[]>([])
  const [personalization, setPersonalization] = useState<PersonalizationSettings>(DEFAULT_PERSONALIZATION)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  const handleBrandingChange = (settings: PersonalizationSettings) => {
    setPersonalization(settings)
    applyBrandingToDocument(settings)
  }

  const logoSrc = getLogoSrc(personalization)

  const handleDataParsed = (items: PocketItem[]) => {
    setData(items)
  }

  const hasLibraryContent = data.length > 0 || shelves.length > 0

  const refetchLibrary = async () => {
    const [items, nextShelves] = await Promise.all([fetchItems(), fetchShelves()])
    handleDataParsed(items)
    setShelves(nextShelves)
  }

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const settings = await fetchPersonalization()
        handleBrandingChange(settings)
      } catch {
        applyBrandingToDocument(DEFAULT_PERSONALIZATION)
      }

      try {
        await checkAuth()
        setIsAuthenticated(true)
        setAuthError(null)
        await refetchLibrary()
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          setIsAuthenticated(false)
          setAuthError(null)
          handleDataParsed([])
          setShelves([])
        } else {
          setAuthError(error instanceof Error ? error.message : 'Failed to connect to OpenShelf.')
        }
      } finally {
        setIsCheckingSession(false)
      }
    }

    void initializeApp()
  }, [])

  const handleLogin = async (password: string) => {
    try {
      await login(password)
      setIsAuthenticated(true)
      setAuthError(null)
      await refetchLibrary()
    } catch (error) {
      setIsAuthenticated(false)
      setAuthError(error instanceof Error ? error.message : 'Failed to unlock OpenShelf.')
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      setIsAuthenticated(false)
      setAuthError(null)
      handleDataParsed([])
      setShelves([])
    }
  }

  const handleDownloadBackup = () => {
    window.location.assign('/api/backup')
  }

  return (
    <div className="min-h-screen bg-background">
      {isAuthenticated ? (
        <Navbar displayName={personalization.display_name} logoSrc={logoSrc} />
      ) : null}
      <div className="container mx-auto px-4 py-4">
        <main className="space-y-8">
          {isCheckingSession ? (
            <div className="flex min-h-[50vh] items-center justify-center">
              <div className="text-sm text-muted-foreground">Loading OpenShelf...</div>
            </div>
          ) : !isAuthenticated ? (
            <LoginForm
              onSubmit={handleLogin}
              error={authError}
              logoSrc={logoSrc}
              logoAlt={personalization.display_name}
            />
          ) : (
            <div className="space-y-6">
              {!hasLibraryContent && (
                <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-green-800">Welcome to OpenShelf.</div>
                      <div className="mt-1 text-xs text-green-700">
                      Hi there 👋. Thanks for checking out OpenShelf! I put together a quick guide to help you get started and make the most of your reading list with OpenShelf.
                      </div>
                    </div>
                    <a
                      href="https://github.com/carlosinho/openshelf/wiki"
                      target="_blank"
                      rel="noopener"
                      className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-green-300 bg-white px-3 text-sm font-medium text-green-800 transition-colors hover:bg-green-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      Read the Guide
                      <ExternalLink className="ml-2 size-4" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              )}
              <div className="bg-card">
                <DataDisplay
                  data={data}
                  shelves={shelves}
                  onRefresh={refetchLibrary}
                  onBrandingChange={handleBrandingChange}
                />
              </div>
            </div>
          )}
        </main>
      </div>

      {isAuthenticated && (
        <div className="container mx-auto mt-16 px-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
            {hasLibraryContent ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Database className="size-4" />
                <span>{data.length} saved links in this OpenShelf library</span>
              </div>
            ) : (
              <div className="min-w-0 flex-1" />
            )}
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button variant="outline" onClick={handleDownloadBackup} className="gap-2">
                <Download className="size-4" />
                Download DB
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                Log out
              </Button>
              <div id="openshelf-footer-settings" className="relative" />
            </div>
          </div>
        </div>
      )}

      <AppFooter
        version={`ver ${packageJson.version}`}
        className={isAuthenticated ? 'mt-4' : ''}
      />

    </div>
  )
}

export default App 