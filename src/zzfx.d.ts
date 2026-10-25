declare module 'zzfx' {
  export function zzfx(...parameters: (number | undefined)[]): AudioBufferSourceNode | undefined;
  export const ZZFX: {
    volume: number;
    audioContext: AudioContext;
  };
}
