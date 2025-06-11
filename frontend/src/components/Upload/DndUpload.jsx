import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadCloud, File as FileIcon, X } from 'lucide-react';

export function DndUpload() {
  const [acceptedFiles, setAcceptedFiles] = useState([]);
  const [rejectedFiles, setRejectedFiles] = useState([]);

  const onDrop = useCallback((accepted, rejected) => {
    setAcceptedFiles(prev => [...prev, ...accepted]);
    setRejectedFiles(prev => [...prev, ...rejected]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    maxSize: 52428800, // 50MB
  });

  const removeFile = (file, isAccepted) => {
    if (isAccepted) {
      setAcceptedFiles(files => files.filter(f => f !== file));
    } else {
      setRejectedFiles(files => files.filter(f => f !== file));
    }
  };

  const acceptedFilesItems = acceptedFiles.map(file => (
    <li key={file.path} className="flex justify-between items-center p-2 bg-green-100 rounded">
      <div className="flex items-center">
        <FileIcon className="h-5 w-5 mr-2 text-green-700" />
        <span className="text-sm text-green-800">{file.path} - {(file.size / 1024 / 1024).toFixed(2)} MB</span>
      </div>
      <Button onClick={() => removeFile(file, true)} variant="ghost" size="sm">
        <X className="h-4 w-4" />
      </Button>
    </li>
  ));

  const rejectedFilesItems = rejectedFiles.map(({ file, errors }) => (
    <li key={file.path} className="flex justify-between items-center p-2 bg-red-100 rounded">
      <div>
        <div className="flex items-center">
          <FileIcon className="h-5 w-5 mr-2 text-red-700" />
          <span className="text-sm text-red-800">{file.path}</span>
        </div>
        <ul>
          {errors.map(e => <li key={e.code} className="text-xs text-red-600 ml-7">{e.message}</li>)}
        </ul>
      </div>
       <Button onClick={() => removeFile({ file, errors }, false)} variant="ghost" size="sm">
        <X className="h-4 w-4" />
      </Button>
    </li>
  ));

  return (
    <section className="container">
      <Card>
        <CardHeader>
          <CardTitle>Upload Telemetry Files</CardTitle>
        </CardHeader>
        <CardContent>
          <div {...getRootProps({ className: 'dropzone border-2 border-dashed rounded-md p-8 text-center cursor-pointer hover:border-primary' })}>
            <input {...getInputProps()} />
            <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
            {isDragActive ?
              <p className="mt-2 text-lg text-primary">Drop the files here ...</p> :
              <p className="mt-2 text-sm text-gray-600">Drag 'n' drop some files here, or click to select files</p>
            }
            <p className="text-xs text-gray-500 mt-1">.CSV files only, up to 50MB</p>
          </div>
          <aside className="mt-4">
            {acceptedFiles.length > 0 && (
              <div>
                <h4 className="font-semibold">Accepted files</h4>
                <ul className="mt-2 space-y-2">{acceptedFilesItems}</ul>
              </div>
            )}
            {rejectedFiles.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold">Rejected files</h4>
                <ul className="mt-2 space-y-2">{rejectedFilesItems}</ul>
              </div>
            )}
          </aside>
          {acceptedFiles.length > 0 && (
             <Button className="mt-4 w-full">Upload {acceptedFiles.length} file(s)</Button>
          )}
        </CardContent>
      </Card>
    </section>
  );
} 