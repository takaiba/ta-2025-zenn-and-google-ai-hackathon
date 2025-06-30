import { useEffect, useState } from "react";

export const useWindowSize = () => {
  const [size, setSize] = useState({
    width: 1000, // windowオブジェクトが存在しない場合のデフォルト値
    height: 1000, // windowオブジェクトが存在しない場合のデフォルト値
  });

  useEffect(() => {
    // ブラウザ環境でのみ実行する
    if (typeof window !== "undefined") {
      const onResize = () => {
        setSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      };

      // 初期サイズ設定
      onResize();

      window.addEventListener("resize", onResize);

      return () => {
        window.removeEventListener("resize", onResize);
      };
    }
  }, []);

  return {
    size,
    isMobile: size.width < 768,
  };
};
