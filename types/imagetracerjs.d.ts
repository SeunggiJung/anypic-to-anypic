declare module "imagetracerjs" {
  interface ImageDataLike {
    width: number;
    height: number;
    data: Uint8ClampedArray | Uint8Array;
  }
  const ImageTracer: {
    /** 래스터 픽셀 데이터를 SVG 문자열로 트레이싱한다. 옵션은 imagetracerjs의 options.md 참고 */
    imagedataToSVG(image: ImageDataLike, options?: Record<string, unknown>): string;
  };
  export default ImageTracer;
}
