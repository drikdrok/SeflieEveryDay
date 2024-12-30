"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { useRef, useState, useEffect } from "react";

import { resizeImageFile } from "./resizeImage";

// Define the type for the component props
interface VideoGeneratorProps {
    images: File[]; // Or you can use string[] if images are URLs
    imageInfo: ImageInfo[];
    frameRate: number;
}

export interface ImageInfo {
  width: number;
  height: number;
  left_eye: number[];
  right_eye: number[];
}

const VideoGenerator: React.FC<VideoGeneratorProps> = ({ images, imageInfo, frameRate }) => {
  const [loaded, setLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const ffmpegRef = useRef(new FFmpeg());
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const messageRef = useRef<HTMLParagraphElement | null>(null);

  const [downloadLink, setDownloadLink] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
    const ffmpeg = ffmpegRef.current;
    ffmpeg.on("log", ({ message }) => {
      if (messageRef.current){
        messageRef.current.innerHTML = message;
        console.log(message);
      } ;
    });
    // toBlobURL is used to bypass CORS issue, urls with the same
    // domain can be used directly.
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        "application/wasm"
      ),
    });
    setLoaded(true);
    setIsLoading(false);
  };


  const generateVideo = async () => {
    setIsLoading(true);

    console.log("Generating video...");
    console.log("Images:", images);

    console.log("eyePositions:", imageInfo);

    const newWidth = 640;

    const compressionFactor = imageInfo[0].width / newWidth;

    const baselineX = (imageInfo[0].left_eye[0] + imageInfo[0].right_eye[0]) / 2 / compressionFactor;
    const baselineY = (imageInfo[0].left_eye[1] + imageInfo[0].right_eye[1]) / 2 / compressionFactor;


    // Initialize FFmpeg using the correct method
    const ffmpeg = ffmpegRef.current;

    // Fetch and load each image into FFmpeg's virtual file system
    for (let i = 0; i < images.length; i++) {
      //const imageUrl = URL.createObjectURL(images[i]);
      let newHeight = Math.floor(imageInfo[i].height / compressionFactor);
      if (newHeight % 2 == 1)
        newHeight -= 1;

      const centerX = (imageInfo[i].left_eye[0] + imageInfo[i].right_eye[0]) / 2 / compressionFactor;
      const centerY = (imageInfo[i].left_eye[1] + imageInfo[i].right_eye[1]) / 2 / compressionFactor;

      const resizedFile = await resizeImageFile(images[i], newWidth, newHeight, baselineX, baselineY, centerX, centerY);
      const imageFileName = `image${i+1}.jpg`;

      // Fetch the image file and write it to the virtual file system
      await ffmpeg.writeFile(imageFileName, await fetchFile(resizedFile));
    }

    // Create a video from the images (you can adjust the frame rate and other parameters)
    await ffmpeg.exec([
        '-y',
        '-framerate', String(frameRate), // 1 image per second
        '-i', 'image%d.jpg', // Input images, where %d is replaced with the index (1.jpg, 2.jpg, ...)
        '-c:v', 'libx264', // Video codec (libx264 is a common choice)
        '-pix_fmt', 'yuv420p', // Pixel format for compatibility
        'output.mp4', // Output file
        '-preset', 'ultrafast',
        '-vf', 'scale=640:480',
        '-frames:v', images.length.toString(),
        '-shortest',
        ]
    );

    console.log("Reading video file...");
    // Retrieve the video file from FFmpeg's virtual file system
    const videoData = await ffmpeg.readFile('output.mp4');

    // Convert ArrayBuffer to Uint8Array
    const videoBlob = new Blob([videoData], { type: "video/mp4" });

    // Create a download URL for the video
    const videoUrl = URL.createObjectURL(videoBlob);
    setDownloadLink(videoUrl);

    setIsLoading(false);

    if (videoRef.current)
        videoRef.current.src = videoUrl;

    console.log("Video generated successfully!");
  };

  useEffect(() => {
    load();
  }, []);

  return loaded ? (
    <div className="flex flex-col items-center">
      <video style={{height:300}} ref={videoRef} controls></video>
      <br />
      <button onClick={generateVideo}>Generate Video</button>
      {downloadLink && (
        <a href={downloadLink} download="generated_video.mp4">
          Download Video
        </a>
      )}
      <p ref={messageRef}></p>
    </div>
  ) : (
    <div>
        <span className="animate-spin ml-3">
            <p>Loading...</p>
        </span>
    </div>
  );
}

export default VideoGenerator;

/*
const transcode = async () => {
    const ffmpeg = ffmpegRef.current;
    // u can use 'https://ffmpegwasm.netlify.app/video/video-15s.avi' to download the video to public folder for testing
    await ffmpeg.writeFile(
      "input.avi",
      await fetchFile(
        "https://raw.githubusercontent.com/ffmpegwasm/testdata/master/video-15s.avi"
      )
    );
    await ffmpeg.exec(["-i", "input.avi", "output.mp4"]);
    const data = (await ffmpeg.readFile("output.mp4")) as any;
    if (videoRef.current)
      videoRef.current.src = URL.createObjectURL(
        new Blob([data.buffer], { type: "video/mp4" })
      );
  };
  */