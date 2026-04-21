import { useState, useCallback } from 'react'
import { FileWithPreview } from '../types/pocket'

interface UseFileUploadOptions {
  multiple?: boolean
  maxFiles?: number
  maxSize?: number
  accept?: string
  onFilesAdded?: (files: FileWithPreview[]) => void
}

interface UseFileUploadState {
  files: FileWithPreview[]
  isDragging: boolean
  errors: string[]
}

interface UseFileUploadActions {
  handleDragEnter: (e: React.DragEvent) => void
  handleDragLeave: (e: React.DragEvent) => void
  handleDragOver: (e: React.DragEvent) => void
  handleDrop: (e: React.DragEvent) => void
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  openFileDialog: () => void
  removeFile: (id: string) => void
  clearFiles: () => void
  getInputProps: () => React.InputHTMLAttributes<HTMLInputElement>
}

export function useFileUpload(options: UseFileUploadOptions = {}): [UseFileUploadState, UseFileUploadActions] {
  const {
    multiple = true,
    maxFiles = 10,
    maxSize = 50 * 1024 * 1024, // 50MB
    accept = '.csv',
    onFilesAdded
  } = options

  const [state, setState] = useState<UseFileUploadState>({
    files: [],
    isDragging: false,
    errors: []
  })

  const validateFiles = useCallback((fileList: FileList | File[]): { validFiles: File[], errors: string[] } => {
    const files = Array.from(fileList)
    const validFiles: File[] = []
    const errors: string[] = []

    if (multiple && files.length + state.files.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} files allowed`)
      return { validFiles: [], errors }
    }

    for (const file of files) {
      if (file.size > maxSize) {
        errors.push(`File ${file.name} is too large (max ${Math.round(maxSize / 1024 / 1024)}MB)`)
        continue
      }

      if (accept && !file.name.toLowerCase().endsWith('.csv')) {
        errors.push(`File ${file.name} is not a CSV file`)
        continue
      }

      validFiles.push(file)
    }

    return { validFiles, errors }
  }, [accept, maxFiles, maxSize, multiple, state.files.length])

  const addFiles = useCallback((files: File[]) => {
    const { validFiles, errors } = validateFiles(files)
    
    if (errors.length > 0) {
      setState(prev => ({ ...prev, errors: [...prev.errors, ...errors] }))
      return
    }

    const newFiles: FileWithPreview[] = validFiles.map(file => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random()}`,
    }))

    setState(prev => ({
      ...prev,
      files: multiple ? [...prev.files, ...newFiles] : newFiles,
      errors: []
    }))

    if (onFilesAdded) {
      onFilesAdded(newFiles)
    }
  }, [multiple, onFilesAdded, validateFiles])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setState(prev => ({ ...prev, isDragging: true }))
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setState(prev => ({ ...prev, isDragging: false }))
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setState(prev => ({ ...prev, isDragging: false }))

    const files = Array.from(e.dataTransfer.files)
    addFiles(files)
  }, [addFiles])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      addFiles(files)
    }
  }, [addFiles])

  const openFileDialog = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.multiple = multiple
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement
      if (target.files) {
        handleFileChange({ target } as React.ChangeEvent<HTMLInputElement>)
      }
    }
    input.click()
  }, [accept, multiple, handleFileChange])

  const removeFile = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      files: prev.files.filter(file => file.id !== id)
    }))
  }, [])

  const clearFiles = useCallback(() => {
    setState(prev => ({
      ...prev,
      files: [],
      errors: []
    }))
  }, [])

  const getInputProps = useCallback((): React.InputHTMLAttributes<HTMLInputElement> => ({
    type: 'file',
    accept,
    multiple,
    onChange: handleFileChange,
    style: { display: 'none' }
  }), [accept, multiple, handleFileChange])

  return [
    state,
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      handleFileChange,
      openFileDialog,
      removeFile,
      clearFiles,
      getInputProps
    }
  ]
} 