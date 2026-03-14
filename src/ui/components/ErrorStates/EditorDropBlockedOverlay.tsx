import { ArrowLeft } from 'lucide-react';
import { t } from '../../../shared/i18n';

type EditorDropBlockedOverlayProps = {
  isVisible: boolean;
};

export function EditorDropBlockedOverlay({
  isVisible,
}: EditorDropBlockedOverlayProps) {
  return (
    <div
      aria-hidden={!isVisible}
      className={`editor-drop-blocked-overlay pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white/45 backdrop-blur-[3px] transition-[opacity,backdrop-filter] duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="flex flex-col items-center">
        <div className="editor-drop-blocked-overlay__arrow mb-6 flex h-[64px] w-[64px] items-center justify-center rounded-full bg-zinc-800 text-white shadow-[0_18px_36px_rgba(24,24,27,0.18)]">
          <ArrowLeft className="h-8 w-8" strokeWidth={2.5} />
        </div>
        <div className="rounded-full border border-zinc-200 bg-white/80 px-6 py-2 text-lg font-medium tracking-wide text-zinc-500 shadow-sm backdrop-blur-md">
          {t('workspace.dropInEditorDisabled')}
        </div>
      </div>
    </div>
  );
}
