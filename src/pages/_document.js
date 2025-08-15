import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />


        <script src="/dist/jeelizFaceFilter.js"></script>
        <script src="/libs/three/v112/three.js"></script>
        <script src="/helpers/JeelizThreeHelper.js"></script>
        <script src="/helpers/JeelizResizer.js"></script>
        <script src="/libs/three/v112/GLTFLoader.js"></script>
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
