"use client";
import React, { useState } from 'react';
import { FFmpeg } from "@ffmpeg/ffmpeg";

const FfmpegComponent: React.FC = () => {
  const [ffmpeg, setFfmpeg] = useState<FFmpeg | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [video, setVideo] = useState<File | null>(null);
  const [output, setOutput] = useState<string | null>(null);

  const loadFfmpeg = async () => {
    const ffmpegInstance = new FFmpeg();
    setFfmpeg(ffmpegInstance);

    await ffmpegInstance.load();
    setIsReady(true);
  };

  const processVideo = async () => {
    if (!ffmpeg || !video) return;

    // Convert File -> Uint8Array
    const arrayBuffer = await video.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    ffmpeg.FS('writeFile', 'input.mp4', uint8Array);

    await ffmpeg.run('-i', 'input.mp4', '-vf', 'scale=320:240', 'output.mp4');
    const data = ffmpeg.FS('readFile', 'output.mp4');
    const url = URL.createObjectURL(new Blob([data], { type: 'video/mp4' }));
    setOutput(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVideo(e.target.files[0]);
    }
  };

  return (
    <div>
      <h1>FFmpeg in Next.js (v0.12+)</h1>
      {!isReady ? (
        <button onClick={loadFfmpeg}>Load FFmpeg</button>
      ) : (
        <>
          <input type="file" onChange={handleFileChange} />
          <button onClick={processVideo} disabled={!video}>
            Process Video
          </button>
        </>
      )}
      {output && (
        <div>
          <h2>Output Video</h2>
          <video controls src={output} />
        </div>
      )}
    </div>
  );
};

export default FfmpegComponent;