/**
 * ConnectionsSettings – Settings tab for managing OAuth connections.
 *
 * Shows which providers are server-configured, which are connected,
 * and lets the user connect/disconnect and import data.
 */

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  ExternalLink,
  Link2,
  Loader2,
  Music,
  RefreshCw,
  Unlink,
} from "lucide-react";
import { linkSocialProvider } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

interface ProviderStatus {
  google: boolean;
  lastfm: boolean;
}

interface ConnectionInfo {
  provider: "google" | "lastfm";
  accountId: string;
  connectedAt: string;
  availableServices: string[];
}

interface ImportResult {
  provider: string;
  service: string;
  fetched: number;
  imported: number;
  errors: string[];
}

// -----------------------------------------------------------------------
// Service descriptors for the cards
// -----------------------------------------------------------------------

const GOOGLE_SERVICES = [
  { id: "gmail", label: "Gmail", description: "Import recent emails as notes" },
  { id: "youtube", label: "YouTube", description: "Import liked videos as bookmarks" },
  { id: "calendar", label: "Calendar", description: "Import upcoming events as tasks" },
];

const LASTFM_SERVICES = [
  { id: "recent-tracks", label: "Recent Tracks", description: "Import recently played songs as notes" },
  { id: "top-tracks", label: "Top Tracks", description: "Import your most played tracks as notes" },
  { id: "top-artists", label: "Top Artists", description: "Import your top artists as notes" },
  { id: "top-albums", label: "Top Albums", description: "Import your top albums as notes" },
];

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

export default function ConnectionsSettings() {
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [connections, setConnections] = useState<ConnectionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [importingService, setImportingService] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch provider status and existing connections
  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const [statusRes, connRes] = await Promise.all([
        fetch("/api/connections/status"),
        fetch("/api/connections"),
      ]);
      const statusData = await statusRes.json();
      const connData = await connRes.json();
      setProviderStatus(statusData.providers);
      setConnections(connData.connections ?? []);
    } catch {
      setError("Failed to load connection status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Connect a provider via Better Auth social sign-in
  const handleConnect = async (provider: "google") => {
    try {
      setError(null);
      await linkSocialProvider(provider, "/settings?tab=connections");
    } catch {
      setError(`Failed to initiate ${provider} connection`);
    }
  };

  // Disconnect a provider
  const handleDisconnect = async (provider: "google") => {
    try {
      setError(null);
      await fetch(`/api/connections/${provider}`, { method: "DELETE" });
      await refresh();
    } catch {
      setError(`Failed to disconnect ${provider}`);
    }
  };

  // Import data from a service
  const handleImport = async (provider: string, service: string) => {
    try {
      setError(null);
      setImportingService(`${provider}:${service}`);
      setLastResult(null);

      const res = await fetch("/api/connections/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, service, maxResults: 25 }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Import failed");
        return;
      }

      setLastResult(data);
    } catch {
      setError("Import request failed");
    } finally {
      setImportingService(null);
    }
  };

  const isConnected = (provider: string) =>
    connections.some((c) => c.provider === provider);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const noProvidersConfigured =
    providerStatus && !providerStatus.google && !providerStatus.lastfm;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Connected Services</CardTitle>
          <CardDescription>
            Link your accounts to import data from external services into Cortex.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Error / result banners */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {lastResult && (
            <div className="flex items-center gap-2 rounded-lg border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
              <Check className="h-4 w-4 shrink-0" />
              Imported {lastResult.imported} items from {lastResult.provider}/{lastResult.service}
              {lastResult.errors.length > 0 && ` (${lastResult.errors.length} errors)`}
            </div>
          )}

          {noProvidersConfigured && (
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-400">
              <p className="font-medium">No providers configured</p>
              <p className="mt-1 text-muted-foreground">
                Set <code className="text-xs">GOOGLE_CLIENT_ID</code>,{" "}
                <code className="text-xs">GOOGLE_CLIENT_SECRET</code>,{" "}
                <code className="text-xs">LASTFM_API_KEY</code>, and{" "}
                <code className="text-xs">LASTFM_USERNAME</code>{" "}
                environment variables to enable connectors.
              </p>
            </div>
          )}

          {/* ---- Google ---- */}
          {providerStatus?.google && (
            <ProviderCard
              name="Google"
              icon={
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              }
              connected={isConnected("google")}
              onConnect={() => handleConnect("google")}
              onDisconnect={() => handleDisconnect("google")}
              services={GOOGLE_SERVICES}
              importingService={importingService}
              onImport={(service) => handleImport("google", service)}
            />
          )}

          {/* ---- Last.fm ---- */}
          {providerStatus?.lastfm && (
            <LastFmCard
              services={LASTFM_SERVICES}
              importingService={importingService}
              onImport={(service) => handleImport("lastfm", service)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// -----------------------------------------------------------------------
// Sub-component – a single provider card
// -----------------------------------------------------------------------

interface ProviderCardProps {
  name: string;
  icon: React.ReactNode;
  connected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  services: { id: string; label: string; description: string }[];
  importingService: string | null;
  onImport: (service: string) => void;
}

function ProviderCard({
  name,
  icon,
  connected,
  onConnect,
  onDisconnect,
  services,
  importingService,
  onImport,
}: ProviderCardProps) {
  const providerKey = name.toLowerCase();

  return (
    <div className="rounded-lg border p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            {icon}
          </div>
          <div>
            <h3 className="font-semibold">{name}</h3>
            <p className="text-sm text-muted-foreground">
              {connected ? (
                <Badge variant="secondary" className="text-xs">
                  <Check className="mr-1 h-3 w-3" /> Connected
                </Badge>
              ) : (
                "Not connected"
              )}
            </p>
          </div>
        </div>

        {connected ? (
          <Button variant="outline" size="sm" onClick={onDisconnect}>
            <Unlink className="mr-1 h-3.5 w-3.5" />
            Disconnect
          </Button>
        ) : (
          <Button size="sm" onClick={onConnect}>
            <Link2 className="mr-1 h-3.5 w-3.5" />
            Connect
          </Button>
        )}
      </div>

      {/* Services – only shown when connected */}
      {connected && (
        <div className="grid gap-2 sm:grid-cols-2">
          {services.map((svc) => {
            const isImporting = importingService === `${providerKey}:${svc.id}`;

            return (
              <div
                key={svc.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{svc.label}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {svc.description}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 ml-2"
                  disabled={!!importingService}
                  onClick={() => onImport(svc.id)}
                  title={`Import from ${svc.label}`}
                >
                  {isImporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------
// Sub-component – Last.fm card (API key auth, always connected when configured)
// -----------------------------------------------------------------------

interface LastFmCardProps {
  services: { id: string; label: string; description: string }[];
  importingService: string | null;
  onImport: (service: string) => void;
}

function LastFmCard({ services, importingService, onImport }: LastFmCardProps) {
  return (
    <div className="rounded-lg border p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Music className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold">Last.fm</h3>
            <p className="text-sm text-muted-foreground">
              <Badge variant="secondary" className="text-xs">
                <Check className="mr-1 h-3 w-3" /> API Key Configured
              </Badge>
            </p>
          </div>
        </div>
        <a
          href="https://www.last.fm/api/account/create"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5 inline mr-1" />
          API Docs
        </a>
      </div>

      {/* Services */}
      <div className="grid gap-2 sm:grid-cols-2">
        {services.map((svc) => {
          const isImporting = importingService === `lastfm:${svc.id}`;

          return (
            <div
              key={svc.id}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{svc.label}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {svc.description}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 ml-2"
                disabled={!!importingService}
                onClick={() => onImport(svc.id)}
                title={`Import from ${svc.label}`}
              >
                {isImporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
