declare module 'segmentit' {
  export class Segment {
    constructor();
  }
  export function useDefault(segment: Segment): {
    doSegment(text: string): Array<{ w: string; p?: number }>;
  };
}
