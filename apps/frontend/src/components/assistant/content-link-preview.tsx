import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bookmark,
  CheckSquare,
  ExternalLink,
  FileText,
  ImageIcon,
  Monitor,
  StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ContentLink } from "@/types/message";

interface ContentLinkPreviewProps {
  link: ContentLink;
}

export const ContentLinkPreview = ({ link }: ContentLinkPreviewProps) => {
  const [thumbnailError, setThumbnailError] = useState(false);

  const getIcon = () => {
    switch (link.type) {
      case "bookmark":
        return <Bookmark className="h-4 w-4" />;
      case "document":
        return <FileText className="h-4 w-4" />;
      case "photo":
        return <Monitor className="h-4 w-4" />;
      case "note":
        return <StickyNote className="h-4 w-4" />;
      case "task":
        return <CheckSquare className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getDisplayContent = () => {
    // Helper to safely access string metadata fields
    const meta = (key: string): string | undefined => {
      const v = link.metadata?.[key];
      return typeof v === "string" ? v : undefined;
    };

    switch (link.type) {
      case "bookmark": {
        const originalUrl = meta("originalUrl");
        return {
          title: link.title || "Untitled Bookmark",
          subtitle: originalUrl ? new URL(originalUrl).hostname : undefined,
          showFavicon: !!meta("faviconUrl"),
          faviconUrl: meta("faviconUrl") || undefined,
          thumbnailUrl: meta("thumbnailUrl") || undefined,
        };
      }

      case "document":
        return {
          title: link.title || "Untitled Document",
          subtitle: meta("originalFilename"),
          thumbnailUrl: meta("thumbnailUrl") || undefined,
        };

      case "photo":
        return {
          title: link.title || "Untitled Photo",
          subtitle: meta("originalFilename"),
          thumbnailUrl: meta("thumbnailUrl") || undefined,
        };

      case "task": {
        const status = meta("status");
        return {
          title: link.title || "Untitled Task",
          subtitle: status ? `Status: ${status.replace("-", " ")}` : undefined,
        };
      }

      case "note": {
        // For notes: show title if available, otherwise show content preview
        const title =
          link.title && link.title !== "Untitled Note" ? link.title : undefined;
        const content = meta("content");
        const contentPreview = content
          ? content.substring(0, 60) + (content.length > 60 ? "..." : "")
          : undefined;

        return {
          title: title || contentPreview || "Untitled Note",
          subtitle: title && contentPreview ? contentPreview : undefined,
        };
      }

      default:
        return {
          title: link.title || `${link.type} ${link.id}`,
          subtitle: undefined,
        };
    }
  };

  const { title, subtitle, showFavicon, faviconUrl, thumbnailUrl } =
    getDisplayContent();
  const showThumbnail = !!thumbnailUrl && !thumbnailError;

  return (
    <Button
      variant="outline"
      className="mt-1.5 w-full justify-start h-auto p-0 text-left overflow-hidden"
      asChild
    >
      <Link to={link.url}>
        <div className="flex flex-col w-full">
          {/* Thumbnail image preview */}
          {showThumbnail && (
            <div className="w-full aspect-video overflow-hidden bg-muted">
              <img
                src={thumbnailUrl}
                alt={title}
                className="w-full h-full object-cover"
                onError={() => setThumbnailError(true)}
              />
            </div>
          )}
          {/* Fallback placeholder when no thumbnail */}
          {!showThumbnail &&
            (link.type === "bookmark" || link.type === "document") && (
              <div className="w-full aspect-video overflow-hidden bg-muted flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
              </div>
            )}
          {/* Title bar with favicon/icon */}
          <div className="flex items-center gap-2.5 w-full min-w-0 p-2.5">
            <div className="shrink-0 flex items-center">
              {showFavicon && faviconUrl ? (
                <img
                  src={faviconUrl}
                  alt="Favicon"
                  className="h-4 w-4"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.nextElementSibling?.classList.remove(
                      "hidden",
                    );
                  }}
                />
              ) : null}
              <div className={showFavicon && faviconUrl ? "hidden" : ""}>
                {getIcon()}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{title}</div>
              {subtitle && (
                <div className="text-xs text-muted-foreground truncate">
                  {subtitle}
                </div>
              )}
            </div>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </div>
        </div>
      </Link>
    </Button>
  );
};
