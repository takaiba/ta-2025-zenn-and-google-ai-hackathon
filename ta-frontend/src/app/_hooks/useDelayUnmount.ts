import { useEffect, useState } from "react";

/**
 * アンマウントを遅延する（主にアニメーション用）
 */
export const useDelayUnmount = (isMounted: boolean, delayTime: number) => {
  const [isRender, setIsRender] = useState(false);

  useEffect(() => {
    let timeoutId: number;
    if (isMounted && !isRender) {
      setIsRender(true);
    } else if (!isMounted && isRender) {
      timeoutId = window.setTimeout(() => setIsRender(false), delayTime);
    }
    return () => clearTimeout(timeoutId);
  }, [isMounted, delayTime, isRender]);

  return isRender;
};
