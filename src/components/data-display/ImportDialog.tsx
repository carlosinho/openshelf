import { useState } from 'react'
import { CheckCircle2, Clock3, FileText } from 'lucide-react'
import { FileUpload } from '../FileUpload'
import type { ImportResult, ImportSource } from '../../types/import'
import { Button } from '../ui/button'
import { ShelfModal } from './ShelfModal'

type ImportProviderId = ImportSource | 'readwise' | 'raindrop'

interface ImportProvider {
  id: ImportProviderId
  name: string
  description: string
  available: boolean
  source?: ImportSource
  uploadHint?: string
  fileDescription?: string
}

interface ImportDialogProps {
  onClose: () => void
  onImportComplete: () => Promise<void> | void
  onImportResult?: (result: ImportResult) => void
}

const IMPORT_PROVIDERS: ImportProvider[] = [
  {
    id: 'pocket',
    name: 'Pocket CSV',
    description: 'Import one or more Pocket CSV export files.',
    available: true,
    source: 'pocket',
  },
  {
    id: 'instapaper',
    name: 'Instapaper',
    description: 'Import Instapaper CSV export files.',
    available: true,
    source: 'instapaper',
  },
  {
    id: 'matter',
    name: 'Matter',
    description: 'Import the Matter history CSV export.',
    available: true,
    source: 'matter',
    uploadHint: 'Upload the Matter export named _matter_history.csv.',
    fileDescription: 'Matter _matter_history.csv file',
  },
  {
    id: 'readwise',
    name: 'Readwise',
    description: 'Coming soon.',
    available: false,
  },
  {
    id: 'raindrop',
    name: 'Raindrop',
    description: 'Coming soon.',
    available: false,
  },
]

export function ImportDialog({
  onClose,
  onImportComplete,
  onImportResult,
}: ImportDialogProps) {
  const [selectedProviderId, setSelectedProviderId] = useState<ImportProviderId>('pocket')
  const selectedProvider = IMPORT_PROVIDERS.find((provider) => provider.id === selectedProviderId)

  return (
    <ShelfModal
      title="Import links"
      description="Bring saved links from another read-later app into OpenShelf."
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="text-sm font-medium">Choose import type</div>
          <div className="grid gap-3 sm:grid-cols-2">
            {IMPORT_PROVIDERS.map((provider) => {
              const isSelected = selectedProviderId === provider.id

              return (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => {
                    if (provider.available) {
                      setSelectedProviderId(provider.id)
                    }
                  }}
                  disabled={!provider.available}
                  className={`rounded-lg border p-4 text-left transition-colors ${
                    provider.available
                      ? isSelected
                        ? 'border-slate-900 bg-slate-50'
                        : 'bg-background hover:bg-slate-50'
                      : 'cursor-not-allowed border-dashed bg-slate-50/80 text-muted-foreground'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-medium text-foreground">{provider.name}</div>
                      <div className="text-sm text-muted-foreground">{provider.description}</div>
                    </div>
                    {provider.available ? (
                      <CheckCircle2
                        className={`size-4 shrink-0 ${isSelected ? 'text-slate-900' : 'text-muted-foreground'}`}
                        aria-hidden="true"
                      />
                    ) : (
                      <Clock3 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {selectedProvider?.source ? (
          <div className="space-y-3 rounded-lg border bg-slate-50 p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="size-4 text-muted-foreground" aria-hidden="true" />
                {selectedProvider.name}
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedProvider.uploadHint ??
                  `Upload CSV exports from ${selectedProvider.name}.`} Valid rows import even if
                some rows are skipped with errors.
              </p>
            </div>
            <FileUpload
              onImportComplete={onImportComplete}
              onImportResult={onImportResult}
              title={`Drop your ${selectedProvider.name} files here`}
              description={`${selectedProvider.fileDescription ?? `${selectedProvider.name} export files`} (max. 50MB each)`}
              inputAriaLabel={`Upload ${selectedProvider.name} files`}
              failureMessage={`Failed to import ${selectedProvider.name} files.`}
              importSource={selectedProvider.source}
            />
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </ShelfModal>
  )
}
