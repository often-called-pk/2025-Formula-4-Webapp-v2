import React, { useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { UploadCloud, File as FileIcon, X, Play } from 'lucide-react'
import LapDeltaChart from './Analysis/charts/LapDeltaChart'
import TrackMap3D from './Analysis/charts/TrackMap3D'
import LapDeltaService from '../services/lapDeltaService'

const Analysis = () => {
  const { id } = useParams()
  const [files, setFiles] = useState([])
  const [lapDeltaData, setLapDeltaData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setFiles(prev => {
      const newFiles = [...prev, ...acceptedFiles]
      return newFiles.slice(0, 2) // Keep only first 2 files
    })
    
    if (rejectedFiles.length > 0) {
      setError(`Some files were rejected. Please upload CSV files only (max 50MB).`)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    maxSize: 52428800, // 50MB
  })

  const removeFile = (fileToRemove) => {
    setFiles(files => files.filter(file => file !== fileToRemove))
  }

  const runAnalysis = async () => {
    if (files.length !== 2) {
      setError('Please upload exactly 2 telemetry files for comparison.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const validation = LapDeltaService.validateFiles(files[0], files[1])
      if (!validation.valid) {
        setError(validation.errors.join(', '))
        return
      }

      const data = await LapDeltaService.getLapDelta(files[0], files[1])
      setLapDeltaData(LapDeltaService.formatLapDeltaData(data))
    } catch (err) {
      setError(`Analysis failed: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const clearAnalysis = () => {
    setLapDeltaData(null)
    setError(null)
    setFiles([])
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold">Telemetry Analysis</h1>
        <p className="text-muted-foreground">
          {id ? `Analysis ID: ${id}` : 'Upload telemetry files to begin analysis'}
        </p>
      </div>

      {/* File Upload Section */}
      {!lapDeltaData && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Upload Telemetry Files</h3>
          <div {...getRootProps({ 
            className: `border-2 border-dashed rounded-md p-8 text-center cursor-pointer transition-colors
                       ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary'}`
          })}>
            <input {...getInputProps()} />
            <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
            {isDragActive ? (
              <p className="mt-2 text-lg text-primary">Drop the files here...</p>
            ) : (
              <div>
                <p className="mt-2 text-sm text-foreground">
                  Drag and drop telemetry files here, or click to select
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload exactly 2 CSV files for comparison (max 50MB each)
                </p>
              </div>
            )}
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Files ({files.length}/2)</h4>
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div key={`${file.name}-${index}`} 
                       className="flex justify-between items-center p-3 bg-muted rounded-md">
                    <div className="flex items-center">
                      <FileIcon className="h-5 w-5 mr-2 text-primary" />
                      <span className="text-sm">
                        {file.name} - {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                    <Button onClick={() => removeFile(file)} variant="ghost" size="sm">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analysis Button */}
          {files.length === 2 && (
            <Button onClick={runAnalysis} disabled={isLoading} className="mt-4 w-full">
              <Play className="h-4 w-4 mr-2" />
              {isLoading ? 'Running Analysis...' : 'Run Lap Delta Analysis'}
            </Button>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}
        </Card>
      )}

      {/* Analysis Results */}
      {lapDeltaData && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Analysis Results</h3>
              <p className="text-muted-foreground text-sm">
                Comparing {lapDeltaData.drivers?.driver1?.name} vs {lapDeltaData.drivers?.driver2?.name}
              </p>
            </div>
            <Button onClick={clearAnalysis} variant="outline">
              New Analysis
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Speed vs Distance Plot */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Speed vs Distance</h3>
              <div className="h-64 bg-muted rounded-md flex items-center justify-center">
                <p className="text-muted-foreground">Speed comparison chart will be displayed here</p>
              </div>
            </Card>

            {/* Lap Delta */}
            <LapDeltaChart 
              lapDeltaData={lapDeltaData}
              isLoading={isLoading}
              error={error}
              height={300}
            />

            {/* Engine Vitals */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Engine Vitals</h3>
              <div className="h-64 bg-muted rounded-md flex items-center justify-center">
                <p className="text-muted-foreground">Engine vitals chart will be displayed here</p>
              </div>
            </Card>

            {/* Driver Actions */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Driver Actions</h3>
              <div className="h-64 bg-muted rounded-md flex items-center justify-center">
                <p className="text-muted-foreground">Driver actions timeline will be displayed here</p>
              </div>
            </Card>
          </div>

          {/* 3D Track Map */}
          <TrackMap3D 
            lapDeltaData={lapDeltaData}
            files={files}
            isLoading={isLoading}
            error={error}
            height={400}
          />
        </div>
      )}
    </div>
  )
}

export default Analysis 