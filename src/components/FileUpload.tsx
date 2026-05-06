import { useState } from 'react'
import { Upload, FileText, AlertCircle } from 'lucide-react'
import { Button } from './ui/button'
import { useFileUpload } from '../hooks/useFileUpload'
import { ApiError, importFiles } from '../lib/api'
import type { ImportResult, ImportSource } from '../types/import'

interface FileUploadProps {
  onImportComplete: () => Promise<void> | void
  className?: string
  onImportResult?: (result: ImportResult) => void
  title?: string
  description?: string
  inputAriaLabel?: string
  selectLabel?: string
  loadingLabel?: string
  failureMessage?: string
  importSource?: ImportSource
}

export function FileUpload({
  onImportComplete,
  className,
  onImportResult,
  title = 'Drop your import files here',
  description,
  inputAriaLabel = 'Upload import files',
  selectLabel = 'Select files',
  loadingLabel = 'Importing...',
  failureMessage = 'Failed to import files.',
  importSource = 'pocket',
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const maxSizeMB = 50
  const maxSize = maxSizeMB * 1024 * 1024

  const handleFilesAdded = async (files: { file: File }[]) => {
    setIsUploading(true)
    setUploadError(null)

    try {
      const result = await importFiles(
        files.map((fileWithPreview) => fileWithPreview.file),
        importSource
      )

      if (result.errors.length > 0) {
        setUploadError(result.errors[0])
      }

      await onImportComplete()
      onImportResult?.(result)
    } catch (error) {
      setUploadError(error instanceof ApiError ? error.message : failureMessage)
    } finally {
      setIsUploading(false)
    }
  }

  const [
    { isDragging, errors },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      getInputProps
    }
  ] = useFileUpload({
    multiple: true,
    maxFiles: 10,
    maxSize,
    accept: '.csv',
    onFilesAdded: handleFilesAdded
  })

  return (
    <div className={`flex flex-col gap-2 ${className ?? ''}`.trim()}>
      <div className="relative">
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          data-dragging={isDragging || undefined}
          className="border-gray-300 data-[dragging=true]:bg-gray-50 relative flex min-h-40 flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors"
        >
          <input
            {...getInputProps()}
            className="sr-only"
            aria-label={inputAriaLabel}
          />
          
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-gray-50">
            <FileText className="h-5 w-5 text-gray-400" />
          </div>
          
          <p className="mb-2 text-sm font-medium text-gray-900">{title}</p>
          
          <p className="mb-6 text-xs text-gray-500">
            {description ?? `Supported import files (max. ${maxSizeMB}MB each)`}
          </p>
          
          <Button
            variant="outline"
            onClick={openFileDialog}
            disabled={isUploading}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <Upload className="mr-2 h-4 w-4" />
            {isUploading ? loadingLabel : selectLabel}
          </Button>
        </div>
      </div>

      {(errors.length > 0 || uploadError) && (
        <div
          className="text-destructive flex items-center gap-1 text-xs"
          role="alert"
        >
          <AlertCircle className="size-3 shrink-0" />
          <span>{uploadError ?? errors[0]}</span>
        </div>
      )}
    </div>
  )
} 