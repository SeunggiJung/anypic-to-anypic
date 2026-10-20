/** 언어별로 번역되는 형식 설명 텍스트 */
export interface FormatText {
  /** 한 줄 소개 */
  summary: string;
  /** 형식 설명 페이지 본문 문단 */
  description: string[];
  strengths: string[];
  weaknesses: string[];
  useCases: string[];
  /** 호환성 설명 */
  compatibility: string;
  /** 역사 문단 */
  history: string[];
}
