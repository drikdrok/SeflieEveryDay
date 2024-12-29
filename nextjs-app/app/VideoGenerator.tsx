"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { useRef, useState, useEffect } from "react";

// Define the type for the component props
interface VideoGeneratorProps {
    images: File[]; // Or you can use string[] if images are URLs
}


const VideoGenerator: React.FC<VideoGeneratorProps> = ({ images }) => {
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

    // Initialize FFmpeg using the correct method
    const ffmpeg = ffmpegRef.current;

    // Fetch and load each image into FFmpeg's virtual file system
    for (let i = 0; i < images.length; i++) {
      const imageUrl = URL.createObjectURL(images[i]);
      const imageFileName = `image${i+1}.png`;

      // Fetch the image file and write it to the virtual file system
      await ffmpeg.writeFile(imageFileName, await fetchFile(imageUrl));
    }

    // Create a video from the images (you can adjust the frame rate and other parameters)
    await ffmpeg.exec([
        '-y',
        '-framerate', '1', // 1 image per second
        '-i', 'image%d.png', // Input images, where %d is replaced with the index (1.jpg, 2.jpg, ...)
        '-c:v', 'libx264', // Video codec (libx264 is a common choice)
        '-pix_fmt', 'yuv420p', // Pixel format for compatibility
        'output.mp4', // Output file
        '-frames:v', images.length.toString(),
        '-shortest',
        ]
    );

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
    <div className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]">
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