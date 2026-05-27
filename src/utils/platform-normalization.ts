const STREAMING_SERVICE_BY_ENUM_INDEX = ['Spotify', 'AppleMusic', 'Deezer'] as const;

const STREAMING_SERVICE_ALIASES: Record<string, string> = {
  spotify: 'Spotify',
  apple: 'AppleMusic',
  applemusic: 'AppleMusic',
  deezer: 'Deezer',
};

export interface NormalizedConnectedService {
  serviceType: string;
  connectedAt: string;
  profileUrl?: string;
}

export function normalizeStreamingServiceType(value: unknown): string {
  if (typeof value === 'number') {
    return STREAMING_SERVICE_BY_ENUM_INDEX[value] ?? String(value);
  }

  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const key = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
  return STREAMING_SERVICE_ALIASES[key] ?? trimmed;
}

function isExplicitFalse(value: unknown): boolean {
  return value === false || value === 0 || value === 'false' || value === '0';
}

function isExplicitTrue(value: unknown): boolean {
  return value === true || value === 1 || value === 'true' || value === '1';
}

export function normalizeConnectedServicePayload(
  service: unknown,
  defaultConnectedAt: string,
): NormalizedConnectedService | null {
  if (typeof service === 'string' || typeof service === 'number') {
    const serviceType = normalizeStreamingServiceType(service);
    if (!serviceType) return null;

    return {
      serviceType,
      connectedAt: defaultConnectedAt,
    };
  }

  if (!service || typeof service !== 'object') {
    return null;
  }

  const payload = service as Record<string, unknown>;
  const isConnected = payload.isConnected ?? payload.IsConnected ?? payload.isValid ?? payload.IsValid;
  if (isExplicitFalse(isConnected)) {
    return null;
  }

  const requiresReconnect = payload.requiresReconnect ?? payload.RequiresReconnect;
  if (isExplicitTrue(requiresReconnect)) {
    return null;
  }

  const serviceType = normalizeStreamingServiceType(payload.serviceType ?? payload.ServiceType);
  if (!serviceType) {
    return null;
  }

  const connectedAt = payload.connectedAt ?? payload.ConnectedAt;
  const profileUrl = payload.profileUrl ?? payload.ProfileUrl;

  return {
    serviceType,
    connectedAt: typeof connectedAt === 'string' ? connectedAt : defaultConnectedAt,
    profileUrl: typeof profileUrl === 'string' ? profileUrl : undefined,
  };
}
