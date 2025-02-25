import React, { useState, useCallback } from 'react';
import { Upload, CheckCircle, AlertCircle, X } from 'lucide-react';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload as S3Upload } from '@aws-sdk/lib-storage';

// Verificar que las variables de entorno no sean undefined
if (!import.meta.env.VITE_AWS_REGION || !import.meta.env.VITE_AWS_ACCESS_KEY_ID || !import.meta.env.VITE_AWS_SECRET_ACCESS_KEY) {
  console.error('Error: Las variables de entorno de AWS no están configuradas correctamente.');
}

// Imprimir las variables de entorno para depuración
console.log('AWS Region:', import.meta.env.VITE_AWS_REGION);
console.log('AWS Access Key ID:', import.meta.env.VITE_AWS_ACCESS_KEY_ID);
console.log('AWS Secret Access Key:', import.meta.env.VITE_AWS_SECRET_ACCESS_KEY);

// Configurar el cliente S3 con las opciones necesarias para CORS
const s3Client = new S3Client({
  region: import.meta.env.VITE_AWS_REGION,
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
  },
  endpoint: `https://s3.${import.meta.env.VITE_AWS_REGION}.amazonaws.com`,
  forcePathStyle: true,
});

interface FileMetadata {
  title: string;
  description: string;
  tags: string[];
}

export const FileUploader: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<FileMetadata>({
    title: '',
    description: '',
    tags: [],
  });
  const [currentTag, setCurrentTag] = useState('');

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const resetForm = () => {
    setSelectedFile(null);
    setMetadata({
      title: '',
      description: '',
      tags: [],
    });
    setCurrentTag('');
    setUploadStatus('idle');
    setProgress(0);
    setErrorMessage('');
  };

  const uploadFile = async () => {
    if (!selectedFile) return;

    try {
      // Verificar que todas las variables de entorno necesarias estén disponibles
      if (!import.meta.env.VITE_AWS_BUCKET_NAME || !import.meta.env.VITE_AWS_REGION) {
        throw new Error('Faltan variables de entorno necesarias');
      }

      console.log('Iniciando carga de archivo...');
      console.log('Bucket:', import.meta.env.VITE_AWS_BUCKET_NAME);
      console.log('Region:', import.meta.env.VITE_AWS_REGION);
      console.log('Nombre del archivo:', selectedFile.name);

      setUploadStatus('uploading');
      setProgress(0);

      const upload = new S3Upload({
        client: s3Client,
        params: {
          Bucket: import.meta.env.VITE_AWS_BUCKET_NAME,
          Key: `uploads/${Date.now()}-${selectedFile.name}`,
          Body: selectedFile,
          ContentType: selectedFile.type,
          Metadata: {
            title: metadata.title,
            description: metadata.description,
            tags: metadata.tags.join(','),
          },
        },
        queueSize: 4, // Número de partes para subir en paralelo
        partSize: 5 * 1024 * 1024, // 5MB por parte
        leavePartsOnError: false, // Limpiar partes fallidas
      });

      upload.on('httpUploadProgress', (progress) => {
        const percentage = Math.round((progress.loaded! / progress.total!) * 100);
        setProgress(percentage);
        console.log('Progreso de carga:', percentage + '%');
      });

      console.log('Iniciando upload.done()...');
      await upload.done();
      console.log('Carga completada exitosamente');
      setUploadStatus('success');
      setTimeout(resetForm, 3000);
    } catch (error) {
      console.error('Error detallado:', {
        message: error instanceof Error ? error.message : 'Error desconocido',
        error: error
      });
      setErrorMessage(error instanceof Error ? error.message : 'Error al subir el archivo');
      setUploadStatus('error');
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const { files } = e.dataTransfer;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && currentTag.trim()) {
      e.preventDefault();
      if (!metadata.tags.includes(currentTag.trim())) {
        setMetadata(prev => ({
          ...prev,
          tags: [...prev.tags, currentTag.trim()],
        }));
      }
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setMetadata(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  return (
    <div className="w-full max-w-xl mx-auto p-6">
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {!selectedFile ? (
          <>
            <input
              type="file"
              className="hidden"
              onChange={handleFileInput}
              id="fileInput"
            />
            <label
              htmlFor="fileInput"
              className="cursor-pointer flex flex-col items-center"
            >
              <Upload
                className={`w-12 h-12 mb-4 ${
                  isDragging ? 'text-blue-500' : 'text-gray-400'
                }`}
              />
              <p className="text-lg font-medium mb-2">
                Drag and drop your file here or click to browse
              </p>
              <p className="text-sm text-gray-500">
                Supported files: Any file type
              </p>
            </label>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-center text-gray-700 mb-4">
              <Upload className="w-6 h-6 mr-2" />
              <span className="font-medium">{selectedFile.name}</span>
            </div>

            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Title"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={metadata.title}
                  onChange={(e) => setMetadata(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div>
                <textarea
                  placeholder="Description"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  value={metadata.description}
                  onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Add tags (press Enter)"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyDown={handleAddTag}
                />
                {metadata.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {metadata.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm flex items-center"
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-blue-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={uploadFile}
                disabled={uploadStatus === 'uploading'}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:bg-blue-300 transition-colors"
              >
                Upload File
              </button>
            </div>
          </div>
        )}

        {uploadStatus === 'uploading' && (
          <div className="mt-6">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-500 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-2">Uploading... {progress}%</p>
          </div>
        )}

        {uploadStatus === 'success' && (
          <div className="mt-6 flex items-center justify-center text-green-500">
            <CheckCircle className="w-6 h-6 mr-2" />
            <span>Upload successful!</span>
          </div>
        )}

        {uploadStatus === 'error' && (
          <div className="mt-6 flex items-center justify-center text-red-500">
            <AlertCircle className="w-6 h-6 mr-2" />
            <span>{errorMessage || 'Upload failed'}</span>
          </div>
        )}
      </div>
    </div>
  );
};