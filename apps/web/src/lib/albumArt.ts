/**
 * 오디오 파일에서 앨범 아트를 추출하여 Blob으로 반환.
 * 없으면 null. 클라이언트에서만 동작.
 */
export async function extractAlbumArt(file: File): Promise<Blob | null> {
  if (typeof window === "undefined") return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsmediatags = (await import("jsmediatags" as any)).default;

  return new Promise((resolve) => {
    jsmediatags.read(file, {
      onSuccess: (tag: { tags: { picture?: { data: number[]; format: string } } }) => {
        const picture = tag.tags.picture;
        if (!picture) {
          resolve(null);
          return;
        }
        const { data, format } = picture;
        const byteArray = new Uint8Array(data);
        resolve(new Blob([byteArray], { type: format }));
      },
      onError: () => {
        resolve(null);
      },
    });
  });
}
