import { useEffect, useRef, useState } from "react";
import { Clock3, ImageIcon, Images, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MediaDetail, MediaItem } from "@/types/cricket";

export function MediaViewer({
  item,
  detail,
  isLoading,
  error
}: {
  item: MediaItem | null;
  detail: MediaDetail | undefined;
  isLoading: boolean;
  error: Error | null;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [selectedGalleryIndex, setSelectedGalleryIndex] = useState(0);
  const resolvedDetail = detail ?? item;
  const galleryImages = detail?.kind === "photo" ? detail.galleryImages : [];
  const selectedGalleryImage = galleryImages[selectedGalleryIndex] ?? galleryImages[0] ?? null;
  const imageUrl = selectedGalleryImage?.imageUrl || detail?.imageUrl || item?.imageUrl || null;
  const description =
    selectedGalleryImage?.caption ||
    detail?.summary ||
    item?.summary ||
    "Choose a video, story, or gallery card to preview media inside Criclytics.";

  useEffect(() => {
    setSelectedGalleryIndex(0);
  }, [detail?.id, item?.id]);

  useEffect(() => {
    const video = videoRef.current;
    const streamUrl = detail?.streamUrl;

    if (!video || detail?.kind !== "video" || !streamUrl) {
      return;
    }

    video.pause();
    video.removeAttribute("src");
    video.load();

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamUrl;
      return () => {
        video.pause();
        video.removeAttribute("src");
        video.load();
      };
    }

    let cancelled = false;
    let hlsInstance:
      | {
          destroy: () => void;
          loadSource: (src: string) => void;
          attachMedia: (media: HTMLMediaElement) => void;
        }
      | null = null;

    void import("hls.js").then(({ default: Hls }) => {
      if (cancelled || !Hls.isSupported()) {
        return;
      }

      hlsInstance = new Hls({
        enableWorker: true
      });

      hlsInstance.loadSource(streamUrl);
      hlsInstance.attachMedia(video);
    });

    return () => {
      cancelled = true;
      hlsInstance?.destroy();
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [detail?.kind, detail?.streamUrl]);

  return (
    <Card className="rounded-lg border-border/70 bg-card/95">
      <CardHeader className="border-b border-border/70">
        <div className="space-y-3">
          <CardTitle className="text-2xl tracking-tight">{detail?.title || item?.title || "Media preview"}</CardTitle>
          <div className="flex flex-wrap gap-2">
            {resolvedDetail?.contextLabel ? <Badge variant="outline">{resolvedDetail.contextLabel}</Badge> : null}
            {resolvedDetail?.durationLabel ? <Badge variant="secondary">{resolvedDetail.durationLabel}</Badge> : null}
            {resolvedDetail?.publishedLabel ? (
              <Badge className="normal-case tracking-normal" variant="secondary">
                <Clock3 className="h-3.5 w-3.5" />
                {resolvedDetail.publishedLabel}
              </Badge>
            ) : null}
            {detail?.kind === "photo" && galleryImages.length ? (
              <Badge className="normal-case tracking-normal" variant="secondary">
                <Images className="h-3.5 w-3.5" />
                {galleryImages.length} frames
              </Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-5">
        <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-border/70 bg-secondary/30 p-3">
          {detail?.kind === "video" && detail.streamUrl ? (
            <video className="h-full w-full rounded-md bg-black object-contain" controls playsInline poster={imageUrl || undefined} preload="metadata" ref={videoRef} />
          ) : imageUrl ? (
            <img
              alt={selectedGalleryImage?.altText || detail?.title || item?.title || "Media preview"}
              className="h-full w-full object-contain"
              loading="lazy"
              src={imageUrl}
            />
          ) : (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              {item?.kind === "video" ? <PlayCircle className="h-8 w-8" /> : <ImageIcon className="h-8 w-8" />}
              <p className="text-sm font-medium">Preview unavailable</p>
            </div>
          )}
        </div>

        {galleryImages.length > 1 ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {galleryImages.map((galleryImage, index) => (
              <button
                className={`overflow-hidden rounded-md border bg-secondary/20 transition ${index === selectedGalleryIndex ? "border-primary ring-2 ring-primary/20" : "border-border/70 hover:border-primary/40"}`}
                key={galleryImage.id}
                onClick={() => setSelectedGalleryIndex(index)}
                type="button"
              >
                <img alt={galleryImage.altText || `Gallery frame ${index + 1}`} className="aspect-[4/3] h-full w-full object-cover" loading="lazy" src={galleryImage.imageUrl} />
              </button>
            ))}
          </div>
        ) : null}

        {isLoading ? <p className="text-sm text-muted-foreground">Loading media preview...</p> : null}
        {error ? <p className="text-sm text-destructive">{error.message}</p> : null}
        <p className="text-sm leading-7 text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
