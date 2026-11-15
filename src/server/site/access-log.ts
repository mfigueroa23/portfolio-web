// One JSON line per request on stdout, with the fields of the former nginx `json` log format.

export interface AccessLogEntry {
  time: Date;
  remoteAddress: string;
  method: string;
  path: string;
  status: number;
  bytes: number;
  durationMs: number;
  referer: string | undefined;
  userAgent: string | undefined;
}

export function accessLogLine(entry: AccessLogEntry): string {
  return JSON.stringify({
    time: entry.time.toISOString(),
    remote_addr: entry.remoteAddress,
    method: entry.method,
    uri: entry.path,
    status: entry.status,
    bytes: entry.bytes,
    request_time: Math.round(entry.durationMs) / 1000,
    referer: entry.referer ?? '',
    user_agent: entry.userAgent ?? '',
  });
}
