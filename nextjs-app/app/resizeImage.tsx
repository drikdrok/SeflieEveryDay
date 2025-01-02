export async function resizeImageFile(
    file: File,
    targetWidth: number,
    targetHeight: number,
    offsetX: number,
    offsetY: number,
    scale: number,
    baselineX: number,
    baselineY: number,
    centerX: number,
    centerY: number,
): Promise<File> {
    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = targetWidth;
            canvas.height = targetHeight;

            const ctx = canvas.getContext("2d");
            if (!ctx) {
                return reject(new Error("Could not create 2D context"));
            }


            // Draw the image onto the canvas at the new size
            ctx.drawImage(img, offsetX, offsetY, targetWidth * scale, targetHeight * scale);

            /*
            ctx.save();
            ctx.fillStyle = "blue";
            ctx.fillRect(centerX - 2, centerY - 2, 4, 4);
    
            ctx.restore();
    
            ctx.fillStyle = "red";
            ctx.fillRect(baselineX - 5, baselineY - 5, 10, 10);
            */

            // Convert the canvas to a Blob
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        return reject(new Error("Canvas is empty or resizing failed."));
                    }
                    // Construct a new File from the blob
                    const resizedFile = new File([blob], file.name, {
                        type: "image/jpeg",
                        lastModified: Date.now(),
                    });
                    resolve(resizedFile);
                },
                "image/jpeg",
                0.8  // JPEG compression quality (0.0 - 1.0)
            );
        };

        img.onerror = (err) => {
            reject(err);
        };

        // Read the file as a DataURL so we can set img.src
        const reader = new FileReader();
        reader.onload = (e) => {
            if (e.target?.result) {
                img.src = e.target.result as string;
            } else {
                reject(new Error("FileReader result is empty."));
            }
        };
        reader.onerror = (err) => {
            reject(err);
        };
        reader.readAsDataURL(file);
    });
}