import type { CSSProperties, ReactNode } from 'react';
import { PlatformTitleBar } from '../../ui/chrome';
import type { AppChromeModel } from '../../ui/chrome/chromeState';

type QuickWriteAppShellProps = {
  chrome: AppChromeModel;
  menuBar: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  editorFontSize: string;
  locale: string;
  localePreference: string;
  shellStyle: CSSProperties;
  themePreference: string;
};

export function QuickWriteAppShell({
  chrome,
  menuBar,
  children,
  footer,
  editorFontSize,
  locale,
  localePreference,
  shellStyle,
  themePreference,
}: QuickWriteAppShellProps) {
  return (
    <main
      className="quick-write-app"
      data-editor-font-size={editorFontSize}
      data-locale={localePreference}
      data-resolved-locale={locale}
      data-theme-preference={themePreference}
      lang={locale}
      style={shellStyle}
    >
      <PlatformTitleBar chrome={chrome} menuBar={menuBar} />
      <div className="quick-write-app-body">
        <section className="quick-write-document-surface">{children}</section>
      </div>
      {footer}
    </main>
  );
}
