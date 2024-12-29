declare module '@ffmpeg/ffmpeg' {
    interface FFmpeg {
      FS(
        cmd: 'writeFile' | 'readFile' | 'unlink',
        path: string,
        data?: Uint8Array
      ): Uint8Array;

      run(...args: string[]): Promise<void>;

    }
  }