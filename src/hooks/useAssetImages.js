import { useEffect, useState } from "react";

export function useAssetImages(manifest) {
  const [map, setMap] = useState({});

  useEffect(() => {
    if (!manifest) {
      return undefined;
    }

    let disposed = false;
    const uniqueItems = [
      manifest.background,
      ...manifest.furniture,
      ...manifest.props,
      ...manifest.states,
      ...manifest.avatars,
    ];

    Promise.all(
      uniqueItems.map(
        (item) =>
          new Promise((resolve, reject) => {
            const image = new window.Image();
            image.crossOrigin = "anonymous";
            image.onload = () => resolve([item.id, image]);
            image.onerror = reject;
            image.src = item.src;
          })
      )
    )
      .then((entries) => {
        if (disposed) {
          return;
        }

        setMap(Object.fromEntries(entries));
      })
      .catch((error) => {
        console.error("Failed to load scene assets", error);
      });

    return () => {
      disposed = true;
    };
  }, [manifest]);

  return { map, ready: Object.keys(map).length > 0 };
}
