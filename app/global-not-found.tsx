import "./globals.css";
import type { Metadata } from "next";
import NotFoundContent from "@/components/NotFoundContent";

export const metadata: Metadata = { title: "404 | AnyPicToAnyPic" };

/**
 * 어떤 경로와도 맞지 않는 주소의 404 페이지. 루트 레이아웃이 [lang] 아래에 있어서 별도 문서를 만든다.
 * 정적 호스팅에서는 404.html 하나만 쓰이므로 언어는 접속한 주소/브라우저 설정으로 클라이언트에서 정한다.
 */
export default function GlobalNotFound() {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <NotFoundContent />
      </body>
    </html>
  );
}
