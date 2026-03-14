export type PlatformChrome = 'windows' | 'macos';

export function detectPlatformChrome(): PlatformChrome {
  if (typeof navigator === 'undefined') {
    return 'windows';
  }

  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('mac')) {
    return 'macos';
  }

  return 'windows';
}
