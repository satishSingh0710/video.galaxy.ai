declare module 'fluent-ffmpeg' {
  interface FfmpegCommand {
    input(source: string): FfmpegCommand;
    outputOptions(options: string[]): FfmpegCommand;
    save(outputPath: string): FfmpegCommand;
    on(event: 'end', callback: () => void): FfmpegCommand;
    on(event: 'error', callback: (err: any) => void): FfmpegCommand;
    // Add other methods as needed
  }

  function ffmpeg(): FfmpegCommand;
  
  namespace ffmpeg {
    export function setFfmpegPath(path: string): void;
  }
  
  export = ffmpeg;
}

// Replace ffmpeg-static with @ffmpeg-installer/ffmpeg
declare module '@ffmpeg-installer/ffmpeg' {
  const path: string;
  const version: string;
  
  export { path, version };
} 