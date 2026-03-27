# markdown-clipboard

## Quick Read

- **id**: `markdown-clipboard`
- **name**: Markdown �����崦��
- **summary**: Ϊ�༭���ṩ Markdown ���ı�ճ��������ѡ���������л������ڴ�ճ���������ı�������ʧ��ʱ����Ϊԭʼ�ı�
- **scope**: �����༭�� `clipboardTextParser` / `clipboardTextSerializer` ���롢Markdown ����/���л����á����ı����˹��򣻲����� HTML ���������ȼ�������ͼƬճ���洢��·��Ctrl+A ѡ������
- **entry_points**:
  - `EditorImpl -> editorProps.clipboardTextParser`
  - `EditorImpl -> editorProps.clipboardTextSerializer`
  - `createMarkdownClipboardTextParser`
  - `createMarkdownClipboardTextSerializer`
- **shared_with**: none
- **check_on_change**:
  - ��ͨ���ı�ճ���Ƿ�ᱻ����Ϊ�ṹ�� Markdown
  - ��ճ���Ƿ��Բ���ԭʼ�ı�
  - ͼƬճ����·�Ƿ�δ�� Markdown ��������
  - ���ƺ�Ĵ��ı��Ƿ����ȶ����� Markdown
- **last_verified**: 2026-03-27

---

## Capability Summary

Markdown �����崦������������ ProseMirror/Tiptap �ļ������ı������ϣ����������нӹܵײ� DOM paste/copy���༭�����յ����ı�����������ʱ�������ȳ��԰� Markdown �����ɽṹ�� Slice���ڴ�ճ��ģʽ�������ı������ʧ��ʱ���˻�Ϊ�������зֵ�ԭʼ�ı����롣����ѡ��ʱ���Ὣ Slice ���°�װΪ doc ��ͨ������ `markdownManager` ���л�Ϊ Markdown �ı���

������������ HTML ���������ݺ�ͼƬճ����·���HTML ���ȼ����ֱ༭��Ĭ����Ϊ��ͼƬ������ `handleDOMEvents` ������ͼƬ�������̡�������ֻ���𡰴��ı� Markdown����һ���ʶ���ת�롣

---

## Entries

| Entry                                            | Trigger                      | Evidence                                                    | Notes                          |
| ------------------------------------------------ | ---------------------------- | ----------------------------------------------------------- | ------------------------------ |
| `EditorImpl.editorProps.clipboardTextParser`     | �༭���յ��ı�ճ������            | `src/domains/editor/core/EditorImpl.tsx:271-280`            | ճ���ı����                      |
| `EditorImpl.editorProps.clipboardTextSerializer` | �༭������/����ѡ��Ϊ�ı�         | `src/domains/editor/core/EditorImpl.tsx:271-280`            | �����ı�����                    |
| `createMarkdownClipboardTextParser`              | ProseMirror �����ı���������  | `src/domains/editor/integration/markdownClipboard.ts:33-52` | �����������˲���                |
| `createMarkdownClipboardTextSerializer`          | ProseMirror �����ı����л����� | `src/domains/editor/integration/markdownClipboard.ts:54-67` | ���𵼳� Markdown                |
| `markdownManager`                                | Markdown parse/serialize     | `src/services/markdown/MarkdownService.ts:13-39`            | ���������������ظ�����������ʵ�� |

---

## Current Rules

### CR-001: ���ӹܴ��ı���������������л�

�༭��ͨ�� `clipboardTextParser` �� `clipboardTextSerializer` ���� Markdown ����������������д `handleDOMEvents` �ļ���ͼƬճ����·��Ҳ���滻 HTML ���������ȼ���

**Evidence**: `src/domains/editor/core/EditorImpl.tsx:271-280`, `src/domains/editor/integration/pasteBridge.ts:10-16`, `src/domains/editor/hooks/useImagePaste.ts:15-62`

---

### CR-002: ��ͨ���ı�ճ�����ȳ��԰� Markdown ����

�� `plain !== true` ���ı���Сδ������ֵʱ��`createMarkdownClipboardTextParser` ����ù��� `markdownManager.parse(text)`���ٰ���ǰ schema ���� Slice ���༭�����롣

**Evidence**: `src/domains/editor/integration/markdownClipboard.ts:33-47`, `src/services/markdown/MarkdownService.ts:13-39`

---

### CR-003: ��ճ�������ƹ� Markdown ����

�� ProseMirror �� `plain === true` �����ı�������ʱ��������ֱ�ӹ���ԭʼ�ı� Slice������ Markdown �ṹ��ת����

**Evidence**: `src/domains/editor/integration/markdownClipboard.ts:39-41`

---

### CR-004: �����ı����� Markdown ����

���ı� UTF-8 �ֽ������� `50 * 1024` ʱ��������ֱ�ӻ��˵�ԭʼ�ı����룬�����ƴ���ı�ճ��ʱ�Ľ����ɱ�����ա�

**Evidence**: `src/domains/editor/integration/markdownClipboard.ts:5-10`, `src/domains/editor/integration/markdownClipboard.ts:39-41`

---

### CR-005: ����ʧ�ܻ���Ϊ�������зֵ�ԭʼ�ı�

Markdown ������ schema �ָ�ʧ��ʱ�������������쳣�����ı��������з�Ϊ����ڵ㣻ÿ������̳е�ǰ����λ�� marks���Ա��ֻ����ı�ճ�����顣

**Evidence**: `src/domains/editor/integration/markdownClipboard.ts:13-31`, `src/domains/editor/integration/markdownClipboard.ts:44-50`

---

### CR-006: ����ѡ��ʱ���� Markdown �ı�

�ı����л����Ὣѡ�� Slice ��װΪ `doc` �ṹ����ͨ������ `markdownManager.serialize(...)` ��� Markdown�������ݷ��ؿ��ַ�����

**Evidence**: `src/domains/editor/integration/markdownClipboard.ts:54-67`, `src/services/markdown/MarkdownService.ts:32-39`

---

## Impact Surface

| Area                   | What to check                                                  | Evidence                                                                                                               |
| ---------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| EditorImpl ���������   | `clipboardTextParser` / `clipboardTextSerializer` �Ƿ�����ȷ���� | `src/domains/editor/core/EditorImpl.tsx:262-280`                                                                       |
| Markdown ���������     | ��ͨճ������ճ���������ı����쳣�����߼��Ƿ�һ��                        | `src/domains/editor/integration/markdownClipboard.ts`                                                                  |
| ���� Markdown �������� | Markdown ��չ���ϱ仯�󣬼��������/���л��Ƿ�ͬ����Ӱ��                   | `src/services/markdown/MarkdownService.ts`                                                                             |
| ͼƬճ����·               | ͼƬ MIME clipboard item �Ƿ�������������ͼƬ����                   | `src/domains/editor/hooks/useImagePaste.ts`, `src/domains/editor/integration/pasteBridge.ts`                           |
| ��Ϊ����                | Markdown �������ͬ�����������ˡ����л������Ƿ�ͨ��                    | `src/domains/editor/integration/markdownClipboard.test.ts`, `src/domains/editor/core/EditorClipboardContracts.test.ts` |

---

## Shared Rules Dependency

| Shared Rule | Dependency                 | Lifted |
| ----------- | -------------------------- | ------ |
| none        | No shared rules identified | no     |

---

## Uncertainties

- ��ǰ��ԭʼ�ı����ˡ����ð������жεĶ��乹�췽ʽ�����������ֱ������л�����̬������༭��Ĭ�ϴ��ı���������һ�£����������Ҫ����ϸ�������б��棬��Ҫ�����������
- ��ǰδ������չ HTML clipboard import/export����δ����Ҫ�� HTML �� Markdown ֮�������ȼ�Э�̣�Ӧ��Ϊ���������������

---

## Known Consumers

| Consumer               | Usage                                        | Evidence                                              |
| ---------------------- | -------------------------------------------- | ----------------------------------------------------- |
| `EditorImpl`           | �� Markdown ��������������༭��ʵ��             | `src/domains/editor/core/EditorImpl.tsx:262-280`      |
| `markdownClipboard.ts` | ͳһ���ؼ�������������л��߼�                     | `src/domains/editor/integration/markdownClipboard.ts` |
| `MarkdownService`      | �ṩ���� `markdownManager` ֧�� parse/serialize | `src/services/markdown/MarkdownService.ts`            |

---

## Archive Pointer

- None. This is a first-version capability document.
