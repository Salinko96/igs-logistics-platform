'use client'

import { useState, useRef, type DragEvent, type ChangeEvent } from 'react'
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
} from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface UploadSuccessResult {
  fileUrl: string
  fileSize: number
  fileType: string
  name: string
  document?: Record<string, unknown>
}

export interface FileUploadDropzoneProps {
  caseId?: string | null
  category?: string
  maxSizeMB?: number
  allowedTypes?: string[]
  onUploadComplete?: (result: UploadSuccessResult) => void
  onError?: (error: string) => void
  autoUpload?: boolean
  disabled?: boolean
  className?: string
}

const DEFAULT_ALLOWED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
]

const DEFAULT_MAX_SIZE_MB = 10

export function FileUploadDropzone({
  caseId,
  category = 'autre',
  maxSizeMB = DEFAULT_MAX_SIZE_MB,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  onUploadComplete,
  onError,
  autoUpload = true,
  disabled = false,
  className,
}: FileUploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [uploadedResult, setUploadedResult] = useState<UploadSuccessResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    if (file.size === 0) {
      return 'Fichier vide (0 octet).'
    }
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      return `Le fichier dépasse la taille maximale autorisée (${maxSizeMB} Mo).`
    }
    const fileExt = `.${file.name.split('.').pop()?.toLowerCase()}`
    const isValidType =
      allowedTypes.includes(file.type.toLowerCase()) ||
      ['.pdf', '.png', '.jpg', '.jpeg'].includes(fileExt)

    if (!isValidType) {
      return 'Format de fichier non autorisé. Formats acceptés : PDF, PNG, JPG.'
    }
    return null
  }

  const uploadFile = (file: File) => {
    setUploading(true)
    setProgress(5)

    const formData = new FormData()
    formData.append('file', file)
    if (caseId) formData.append('caseId', caseId)
    if (category) formData.append('category', category)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/documents/upload', true)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100)
        setProgress(percent)
      }
    }

    xhr.onload = () => {
      setUploading(false)
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res: UploadSuccessResult = JSON.parse(xhr.responseText)
          setProgress(100)
          setUploadedResult(res)
          if (onUploadComplete) onUploadComplete(res)
        } catch {
          const err = 'Erreur lors du traitement de la réponse du serveur.'
          setErrorMessage(err)
          if (onError) onError(err)
        }
      } else {
        let errStr = 'Erreur lors du téléversement.'
        try {
          const errJson = JSON.parse(xhr.responseText)
          if (errJson.error) errStr = errJson.error
        } catch {}
        setErrorMessage(errStr)
        if (onError) onError(errStr)
      }
    }

    xhr.onerror = () => {
      setUploading(false)
      const errStr = 'Erreur réseau lors du téléversement.'
      setErrorMessage(errStr)
      if (onError) onError(errStr)
    }

    xhr.send(formData)
  }

  const handleFileSelect = (file: File) => {
    setErrorMessage(null)
    setUploadedResult(null)
    const err = validateFile(file)
    if (err) {
      setErrorMessage(err)
      if (onError) onError(err)
      return
    }
    setSelectedFile(file)
    if (autoUpload) {
      uploadFile(file)
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled && !uploading) setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (disabled || uploading) return

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0])
    }
  }

  const resetState = () => {
    setSelectedFile(null)
    setUploadedResult(null)
    setErrorMessage(null)
    setProgress(0)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className={cn('w-full space-y-3', className)}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && !disabled && inputRef.current?.click()}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-all duration-200 cursor-pointer',
          isDragging
            ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
            : 'border-muted-foreground/25 hover:border-primary/50 bg-muted/20',
          errorMessage && 'border-destructive/50 bg-destructive/5',
          uploadedResult && 'border-green-500/50 bg-green-500/5',
          (disabled || uploading) && 'pointer-events-none opacity-60'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled || uploading}
        />

        {uploading ? (
          <div className="w-full space-y-3">
            <Loader2 className="mx-auto size-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">
              Téléversement en cours... {progress}%
            </p>
            <Progress value={progress} className="h-2 w-full" />
          </div>
        ) : uploadedResult ? (
          <div className="flex w-full items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <CheckCircle2 className="size-8 text-green-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">
                  {uploadedResult.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Fichier téléversé avec succès ({(uploadedResult.fileSize / (1024 * 1024)).toFixed(2)} Mo)
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation()
                resetState()
              }}
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : selectedFile && !errorMessage ? (
          <div className="flex w-full items-center gap-3 text-left">
            <FileText className="size-8 text-primary shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} Mo
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UploadCloud className="size-5" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Glissez-déposez votre fichier ici, ou{' '}
              <span className="text-primary underline">parcourez</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Formats acceptés : PDF, PNG, JPG (Max {maxSizeMB} Mo)
            </p>
          </>
        )}
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 text-xs font-medium text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  )
}
