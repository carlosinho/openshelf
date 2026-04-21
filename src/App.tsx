import { useEffect, useState } from 'react'
import { FileUpload } from './components/FileUpload'
import { DataDisplay } from './components/DataDisplay'
import { Navbar } from './components/Navbar'
import { KarolBadge } from './components/KarolBadge'
import { KarolFooter } from './components/KarolFooter'
import { LoginForm } from './components/LoginForm'
import { PocketItem } from './types/pocket'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './components/ui/accordion'
import { Database, Download, ShieldCheck } from 'lucide-react'
import { Button } from './components/ui/button'
import { ApiError, checkAuth, fetchItems, login, logout } from './lib/api'

function App() {
  const [data, setData] = useState<PocketItem[]>([])
  const [hasData, setHasData] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  const handleDataParsed = (items: PocketItem[]) => {
    setData(items)
    setHasData(items.length > 0)
  }

  const refetchItems = async () => {
    const items = await fetchItems()
    handleDataParsed(items)
  }

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await checkAuth()
        setIsAuthenticated(true)
        setAuthError(null)
        await refetchItems()
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          setIsAuthenticated(false)
          setAuthError(null)
          handleDataParsed([])
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
      await refetchItems()
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
    }
  }

  const handleDownloadBackup = () => {
    window.location.assign('/api/backup')
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-4">
        <main className="space-y-8">
          {isCheckingSession ? (
            <div className="flex min-h-[50vh] items-center justify-center">
              <div className="text-sm text-muted-foreground">Loading OpenShelf...</div>
            </div>
          ) : !isAuthenticated ? (
            <LoginForm onSubmit={handleLogin} error={authError} />
          ) : !hasData ? (
            <div className="bg-card">
              <div className="mb-6">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="privacy" className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                    <AccordionTrigger className="py-3 text-green-800 dark:text-green-200 hover:bg-green-100 dark:hover:bg-green-800/30">
                      <span className="flex items-center gap-3">
                        <ShieldCheck
                          size={16}
                          className="shrink-0 opacity-80"
                          aria-hidden="true"
                        />
                        <span>This self-hosted app stores your data on this OpenShelf instance only.</span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="text-green-800 dark:text-green-200 ps-7 pb-3">
                      <div className="space-y-1 text-sm opacity-90">
                        <div className="font-medium mb-2">Instance-local storage:</div>
                        <div>• Links persist in a local SQLite database on this server</div>
                        <div>• Access is protected by the configured instance password</div>
                        <div>• No user accounts or external services are required</div>
                        <div className="mt-2 text-sm italic">
                          Back up your library any time by downloading the database file from inside the app.
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
              <h2 className="text-2xl font-semibold mb-4">
                Get Started
              </h2>
              <p className="text-muted-foreground mb-6">
                Import one or more Pocket CSV export files to create your persistent library.
              </p>

              <div className="flex flex-wrap items-center gap-3 mb-6">
                <Button variant="outline" onClick={handleLogout}>
                  Log out
                </Button>
              </div>

              <FileUpload onImportComplete={refetchItems} />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-card">
                <DataDisplay data={data} onRefresh={refetchItems} />
              </div>
            </div>
          )}
        </main>
      </div>

      {isAuthenticated && hasData && (
        <div className="container mx-auto mt-16 px-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Database className="size-4" />
              <span>{data.length} saved links in this OpenShelf library</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={handleDownloadBackup} className="gap-2">
                <Download className="size-4" />
                Download DB
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                Log out
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Footer */}
      <KarolFooter version="ver 0.51" className={isAuthenticated && hasData ? 'mt-4' : ''} />
      
      {/* Karol Badge - floating face 
      <KarolBadge />*/}
      
    </div>
  )
}

export default App 