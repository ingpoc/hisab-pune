type LayerLike = {
  id: string;
  type: string;
  'source-layer'?: string;
};

/**
 * Positron symbol layers we keep: road names and place labels.
 * Everything else that is a symbol (POI, shields, housenumbers, water names)
 * is dropped. Non-symbol layers stay.
 */
function keepSymbol(layer: LayerLike): boolean {
  const id = layer.id.toLowerCase();
  const source = (layer['source-layer'] ?? '').toLowerCase();
  const text = `${id} ${source}`;
  if (/poi|highway-shield|housenumber|road_shield|(^|[-_\s])shield\b/.test(text)) return false;
  const road = source === 'transportation_name' || /highway-name|road[-_](?:name|label)/.test(id);
  const place = source === 'place' || id.startsWith('label_') || /(^|[-_])place(?:[-_]|$)/.test(id);
  return road || place;
}

export function slimPositronStyle<T extends { layers: LayerLike[] }>(style: T): T {
  const layers = style.layers.filter((layer) => layer.type !== 'symbol' || keepSymbol(layer));
  return { ...style, layers: layers as T['layers'] };
}
