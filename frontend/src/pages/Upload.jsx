import React from 'react'
import { DndUpload } from '@/components/Upload/DndUpload'

const Upload = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Upload Telemetry Data</h1>
      <DndUpload />
    </div>
  )
}

export default Upload 