"use client";
import { Accept, useDropzone } from 'react-dropzone';
import { use, useEffect, useState, useRef } from 'react';
import VideoGenerator from './VideoGenerator';
import { ImageInfo } from './VideoGenerator';
import { Slider } from "@nextui-org/slider";
import { Progress } from "@nextui-org/progress";
import imageCompression from 'browser-image-compression';
import Image from 'next/image';

import axios from 'axios';


interface LoadingBar {
    show: boolean;
    loadText: string;
    loadProgress: number;
}

const api_url = 'http://127.0.0.1:5000';

export default function Home() {

    const [files, setFiles] = useState<File[]>([]);
    const [fileURLS, setFileURLS] = useState<string[]>([]);

    const intervalRef = useRef<number | null>(null);

    const [readyToGenerate, setReadyToGenerate] = useState(false);

    const [loadingBar, setLoadingBar] = useState<LoadingBar>({ show: false, loadText: "", loadProgress: 0 });

    const [eyePositions, setEyePositions] = useState<ImageInfo[] | null>(null);

    const [frameRate, setFrameRate] = useState(10);


    useEffect(() => {
        const newUrls = files.map((file) => URL.createObjectURL(file));
        setFileURLS(newUrls);
    }, [files]);


    useEffect(() => {
        if (eyePositions !== null) {
            if (eyePositions.length > 0) {
                setReadyToGenerate(true);
                console.log("Ready to generate");
            }
        }
    }, [eyePositions]);

    const deleteFile = (index: number) => {
        const updatedFiles = [...files];
        const updatedFileURLs = [...fileURLS];
        updatedFiles.splice(index, 1);
        updatedFileURLs.splice(index, 1);
        
        if (eyePositions !== null) {
            const updatedEyePositions = [...eyePositions];
            updatedEyePositions.splice(index, 1);
            setEyePositions(updatedEyePositions);
        }

        setFiles(updatedFiles);
    };

    const onDrop = async (acceptedFiles: File[]) => {
        const compressedFiles: File[] = [];
        const totalFiles = acceptedFiles.length;

        let completed = 0; // from 0 to totalFiles

        setLoadingBar({ show: true, loadText: "Compressing images...", loadProgress: 0 });

        for (const file of acceptedFiles) {
            // Adjust options as desired
            const options = {
                maxSizeMB: 1,
                maxWidthOrHeight: 1024,
                useWebWorker: true,
            };
            const compressedFile = await imageCompression(file, options);
            completed += 1;

            setLoadingBar((prev) => ({ ...prev, loadProgress: completed / totalFiles * 100 }));


            compressedFiles.push(new File([compressedFile], file.name));
        }

        setLoadingBar({ show: false, loadText: "", loadProgress: 0 });

        setFiles((prevFiles) => [...prevFiles, ...compressedFiles]);
        // setFiles((prevFiles) => [...prevFiles, ...acceptedFiles]);
    };

    const { getRootProps, getInputProps } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.jpeg', '.jpg', '.png'],
        },
    });

    const handleUpload = async () => {
        if (files.length === 0) {
            alert('Please upload some images first!');
            return;
        }

        setLoadingBar({ show: true, loadText: "Uploading images...", loadProgress: 0 });

        const formData = new FormData();
        files.forEach((file) => {
            formData.append('images', file);
        });

        try {
            const response = await axios.post(api_url + "/upload_images", formData, {
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const progress = Math.round(
                            (progressEvent.loaded * 100) / progressEvent.total
                        );
                        setLoadingBar((prev) => ({ ...prev, loadProgress: progress }));
                    }
                },
            });

            //alert('Upload successful!');
            console.log(response.data);

            const { job_id } = response.data;

            // 2. Start polling for the job’s processing progress
            if (job_id) {
                startPolling(job_id);
                setLoadingBar({ show: true, loadText: "Analyzing images...", loadProgress: 0 });
            }
            // do something with response.data["eye_position"]

        } catch (error) {
            alert('Error uploading images');
            console.error(error);
            setLoadingBar({ show: false, loadText: "", loadProgress: 0 });
        } finally {
            //setLoadingBar({show: false, loadText: "", loadProgress: 0}); 
        }
    };

    const startPolling = (jobId: string) => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        intervalRef.current = window.setInterval(async () => {
            try {
                const resp = await axios.get(api_url + "/get_progress/" + jobId);
                const { progress } = resp.data;
                setLoadingBar((prev) => ({ ...prev, loadProgress: progress }));
                console.log('Progress:', progress);

                // Stop polling if done
                if (progress >= 100) {
                    clearInterval(intervalRef.current!);
                    intervalRef.current = null;
                    try {
                        const resp = await axios.get(api_url + "/get_info/" + jobId);
                        console.log('Final Response:', resp.data);
                        const eye_position = resp.data["data"]["eye_position"];
                        console.log('Eye Positions:', eye_position);
                        setEyePositions(eye_position);
                        setLoadingBar({ show: false, loadText: "", loadProgress: 0 });
                    } catch (error) {
                        console.error('Get Info error:', error);
                    }
                }
            } catch (error) {
                console.error('Polling error:', error);
                clearInterval(intervalRef.current!);
            }
        }, 1000);
    };


    return (
        <div>
            <h1 className="ml-4 mt-4 text-4xl font-bold text-gray-900 leading-tight tracking-wide">Seflie Every Day</h1>
            <div style={{ display: 'flex', gap: '2rem', padding: '2rem' }}>
                <div className='flex-shrink-1 min-w-80  w-80 p-6 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700'>
                    <h1>Settings</h1>
                    <div
                        {...getRootProps()}
                        style={{
                            border: '2px dashed #0070f3',
                            padding: '2rem',
                            cursor: 'pointer',
                            textAlign: 'center',
                            borderRadius: '8px',
                        }}
                    >
                        <input {...getInputProps()} />
                        <p>Drag & drop some images here, or click to select images</p>
                    </div>
                    <div className="pt-6">
                        <Slider
                            className="max-w-md"
                            color="primary"
                            defaultValue={10}
                            label="Frame Rate"
                            maxValue={30}
                            minValue={1}
                            size="md"
                            step={1}
                            onChange={(value) => setFrameRate(Array.isArray(value) ? value[0] : value)}
                        />
                    </div>
                    <div className="flex justify-center pt-6">
                        <button
                            onClick={handleUpload}
                            disabled={loadingBar.show}
                            style={{
                                padding: '1rem 2rem',
                                fontSize: '16px',
                                backgroundColor: '#0070f3',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: loadingBar.show ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {loadingBar.show ? 'Loading...' : 'Analyze Images'}
                        </button>
                    </div>
                    <div>
                        {
                            loadingBar.show &&
                            <Progress
                                label={loadingBar.loadText}
                                className="max-w-md"
                                color="success"
                                showValueLabel={true}
                                size="md"
                                value={loadingBar.loadProgress}
                            />
                        }
                    </div>
                </div>

                <div className='flex-shrink-1 min-w-80 w-80  p-6 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700'>
                    <h1>Final Video</h1>
                    <div>
                        <VideoGenerator images={files} imageInfo={eyePositions} frameRate={frameRate} readyToGenerate={readyToGenerate} />
                    </div>
                </div>

                <div style={{ display: 'flex', flexWrap: "wrap", gap: '10px', overflowY: 'auto', maxHeight: '500px' }}>
                    {fileURLS.map((url, index) => (
                        <div key={index} className="image-container">
                            <Image
                                src={url}
                                alt={`Uploaded image ${index}`}
                                width={100}
                                height={100}
                                style={{ width: "200px", borderRadius: '8px' }}
                                id={`image${index}`}
                                loading='lazy'
                            />
                            <img src="/trash.png" className="delete-btn" onClick={() => deleteFile(index)} />
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}


