const urls = import.meta.glob<string>('../assets/tiles/*.png', { eager: true, query: '?url', import: 'default' });

const byName = new Map(Object.entries(urls).map(([path, url]) => [path.replace(/^.*\/(.+)\.png$/, '$1'), url]));

export function tileUrl(name: string): string | undefined {
  return byName.get(name);
}

/** Cache delle immagini di tile caricata all'avvio. */
export class TileImages {
  private readonly images = new Map<string, HTMLImageElement>();

  constructor(private readonly onLoad: () => void) {}

  /** Ritorna l'immagine se è stata caricata, altrimenti la scarica. */
  get(name: string): HTMLImageElement | undefined {
    let img = this.images.get(name);
    if (!img) {
      const url = byName.get(name);
      if (!url) return undefined;
      img = new Image();
      img.onload = this.onLoad;
      img.src = url;
      this.images.set(name, img);
    }
    return img.complete && img.naturalWidth > 0 ? img : undefined;
  }
}
