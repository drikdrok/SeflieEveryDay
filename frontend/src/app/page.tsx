"use client";
import { Accept, useDropzone } from 'react-dropzone';
import { useState } from 'react';

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const api_url = 'http://127.0.0.1:5000/upload_images';

  const onDrop = (acceptedFiles: File[]) => {
    // Add new files to the existing files array
    setFiles((prevFiles) => [...prevFiles, ...acceptedFiles]);
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: 'image/*' as unknown as Accept, // Correctly type the accept property
  });

  const handleUpload = async () => {
    if (files.length === 0) {
      alert('Please upload some images first!');
      return;
    }

    setIsUploading(true);

    const formData = new FormData();

    // Append all files to the FormData object
    files.forEach((file) => {
      formData.append('images', file);
    });

    try {
      const response = await fetch(api_url, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload images');
      }

      const data = await response.json();
      alert('Upload successful!');
      console.log(data);
    } catch (error) {
      alert('Error uploading images');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };


  return (
    <div style={{ display: 'flex', gap: '2rem', padding: '2rem' }}>
      <div
        {...getRootProps()}
        style={{
          border: '2px dashed #0070f3',
          padding: '2rem',
          cursor: 'pointer',
          textAlign: 'center',
          width: '300px',
          borderRadius: '8px',
        }}
      >
        <input {...getInputProps()} />
        <p>Drag & drop some images here, or click to select images</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem' }}>
        {files.map((file, index) => (
          <div key={index} style={{ width: '100%', height: 'auto' }}>
            <img
              src={URL.createObjectURL(file)}
              alt={`Uploaded image ${index}`}
              style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
            />
          </div>
        ))}
      </div>

      <div>
        <button
          onClick={handleUpload}
          disabled={isUploading}
          style={{
            padding: '1rem 2rem',
            fontSize: '16px',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: isUploading ? 'not-allowed' : 'pointer',
          }}
        >
          {isUploading ? 'Uploading...' : 'Upload Images'}
        </button>
      </div>
    </div>
  );
}
