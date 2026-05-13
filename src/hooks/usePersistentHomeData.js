import { useEffect, useState } from "react";
import { createDefaultHomeData, loadHomeData, saveHomeData } from "../homeData";

export function usePersistentHomeData(manifest) {
  const [homeData, setHomeData] = useState(null);

  useEffect(() => {
    if (!manifest) {
      return;
    }

    setHomeData(loadHomeData(manifest));
  }, [manifest]);

  useEffect(() => {
    if (!manifest || !homeData) {
      return;
    }

    saveHomeData(homeData);
  }, [homeData, manifest]);

  const resetHomeData = () => {
    if (!manifest) {
      return;
    }

    setHomeData(createDefaultHomeData(manifest));
  };

  return {
    homeData,
    setHomeData,
    resetHomeData,
  };
}
