const urls = import.meta.glob<string>('../assets/tiles/*.png', { eager: true, query: '?url', import: 'default' });

const byName = new Map(Object.entries(urls).map(([path, url]) => [path.replace(/^.*\/(.+)\.png$/, '$1'), url]));

export function tileUrl(name: string): string | undefined {
  return byName.get(name);
}

/** Immagini delle tile di terreno, caricate una volta; `onLoad` ridisegna quando arrivano. */
export class TileImages {
  private readonly images = new Map<string, HTMLImageElement>();

  constructor(private readonly onLoad: () => void) {}

  /** L'immagine pronta, oppure undefined finché non è caricata (o se il nome non esiste). */
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
