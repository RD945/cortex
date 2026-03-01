import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { Camera, X, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface QRScannerProps {
  /** Called when a valid QR code is scanned */
  onScan: (value: string) => void;
  /** Called when the scanner is closed */
  onClose: () => void;
  /** Whether the scanner should be visible */
  open: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Camera-based QR code scanner for mobile login.
 * Uses html5-qrcode to access the device camera and decode QR codes.
 */
export function QRScanner({ onScan, onClose, open, className }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scannedRef = useRef(false);
  const { toast } = useToast();

  const stopScanner = useCallback(async () => {
    try {
      if (
        scannerRef.current &&
        scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING
      ) {
        await scannerRef.current.stop();
      }
    } catch {
      // Ignore stop errors
    }
    scannerRef.current = null;
  }, []);

  const startScanner = useCallback(async () => {
    if (!containerRef.current || scannedRef.current) return;

    setIsStarting(true);
    setError(null);

    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          if (scannedRef.current) return;
          scannedRef.current = true;

          // Validate it looks like an API key
          if (decodedText.startsWith("sk-")) {
            onScan(decodedText);
            stopScanner();
          } else {
            toast({
              title: "Invalid QR code",
              description: "This QR code does not contain a valid login key.",
              variant: "destructive",
            });
            scannedRef.current = false;
          }
        },
        () => {
          // QR code not detected in this frame - this is normal
        },
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not start camera";
      if (message.includes("NotAllowedError") || message.includes("Permission")) {
        setError("Camera permission denied. Please allow camera access.");
      } else if (message.includes("NotFoundError")) {
        setError("No camera found on this device.");
      } else {
        setError(message);
      }
    } finally {
      setIsStarting(false);
    }
  }, [onScan, stopScanner, toast]);

  useEffect(() => {
    if (open) {
      scannedRef.current = false;
      startScanner();
    } else {
      stopScanner();
    }
    return () => {
      stopScanner();
    };
  }, [open, startScanner, stopScanner]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90",
        className,
      )}
    >
      <div className="relative w-full max-w-sm mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-white">
            <Camera className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Scan QR Code</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="relative rounded-lg overflow-hidden bg-gray-900">
          <div id="qr-reader" ref={containerRef} className="w-full" />

          {isStarting && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="flex flex-col items-center gap-2 text-white">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm">Starting camera...</p>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-3 p-3 bg-destructive/20 text-destructive-foreground text-sm rounded-md text-center">
            {error}
          </div>
        )}

        <p className="mt-3 text-xs text-gray-400 text-center">
          Point your camera at the QR code shown in Settings &gt; Profile
        </p>
      </div>
    </div>
  );
}
