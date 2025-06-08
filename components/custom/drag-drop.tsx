"use client"

import { useCallback } from 'react'
import { useDropzone, Accept } from 'react-dropzone'
import { Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DragDropProps {
  accept?: Accept
  maxSize?: number
  onDrop: (acceptedFiles: File[]) => void
  value?: File
  className?: string
}

export default function DragDrop({
  accept = { 'video/*': ['.mp4', '.mov', '.avi'] },
  maxSize = 10 * 1024 * 1024 * 1024, // 10GB
  onDrop,
  value,
  className,
}: DragDropProps) {
  const onDropCallback = useCallback(
    (acceptedFiles: File[]) => {
      onDrop(acceptedFiles)
    },
    [onDrop]
  )

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    accept,
    maxSize,
    onDrop: onDropCallback,
  })

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 transition-colors',
        isDragActive && !isDragReject && 'border-primary/50 bg-primary/5',
        isDragReject && 'border-destructive/50 bg-destructive/5',
        !isDragActive && !isDragReject && 'border-muted-foreground/25 hover:border-primary/20 hover:bg-muted/50',
        className
      )}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center justify-center space-y-2 text-center">
        {value ? (
          <>
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <Upload className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">{value.name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(value.size)}</p>
              <p className="text-xs text-muted-foreground">
                Click or drag to replace
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-full bg-muted p-2">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {isDragActive
                  ? isDragReject
                    ? 'File type or size not accepted'
                    : 'Drop your video here'
                  : 'Click or drag to upload'}
              </p>
              <p className="text-xs text-muted-foreground">
                Maximum file size: {formatFileSize(maxSize)}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
} 