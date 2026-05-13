export function getRenderedSize(item, image) {
  if (!image) {
    return { width: item.width ?? 0, height: 0 };
  }

  const width = item.width ?? image.width;
  const height = width * (image.height / image.width);
  return { width, height };
}

export function clampToZone(position, size, zone, gridSize) {
  const nextX = Math.max(zone.x, Math.min(zone.x + zone.width - size.width, position.x));
  const nextY = Math.max(zone.y, Math.min(zone.y + zone.height - size.height, position.y));

  return {
    x: zone.x + Math.round((nextX - zone.x) / gridSize) * gridSize,
    y: zone.y + Math.round((nextY - zone.y) / gridSize) * gridSize,
  };
}
