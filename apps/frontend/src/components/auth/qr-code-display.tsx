import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { Copy, Check, QrCode, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface QRCodeDisplayProps {
  /** The API key to encode in the QR code */
  apiKey: string;
  /** Optional label for the API key */
  label?: string;
  /** Size of the QR code in pixels */
  size?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Displays an API key as a QR code that can be scanned by a mobile device
 * to log in without entering credentials.
 */
export function QRCodeDisplay({
  apiKey,
  label,
  size = 200,
  className,
}: QRCodeDisplayProps) {
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      toast({ title: "API key copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Failed to copy",
        description: "Please copy the key manually.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-medium">Mobile QR Login</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowQR(!showQR)}
        >
          {showQR ? (
            <>
              <EyeOff className="h-4 w-4 mr-1" />
              Hide QR
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-1" />
              Show QR
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Scan this QR code with your phone to sign in instantly — no password
        needed.
      </p>

      {showQR && (
        <div className="flex flex-col items-center gap-3 p-4 border rounded-lg bg-white dark:bg-white">
          <QRCodeSVG
            value={apiKey}
            size={size}
            level="M"
            includeMargin
            bgColor="#FFFFFF"
            fgColor="#000000"
          />
          {label && (
            <p className="text-xs text-gray-500 font-mono truncate max-w-50">
              {label}
            </p>
          )}
        </div>
      )}

      {showQR && (
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs font-mono bg-muted px-2 py-1.5 rounded truncate">
            {apiKey.slice(0, 12)}...{apiKey.slice(-8)}
          </code>
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
