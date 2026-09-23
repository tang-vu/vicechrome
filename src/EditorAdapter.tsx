import ImageEditor from '@unlayer/react-image-editor';
import type { ImageEditorInstance } from '@unlayer/react-image-editor';

export interface EditorAdapterProps {
  image: string;
  onSave: (result: { dataUrl: string; blob: Blob }) => void;
  onCancel: () => void;
  onFailure: (message: string) => void;
  onLoaded: (editor: ImageEditorInstance) => void;
}

const options = { theme: 'dark' as const, features: { ai: { enabled: false, assistant: false } } };

export default function EditorAdapter({ image, onSave, onCancel, onFailure, onLoaded }: EditorAdapterProps) {
  return <ImageEditor image={image} options={options} minHeight={0} style={{ height: '100%', minHeight: 0 }} onLoad={onLoaded} onSave={onSave} onCancel={onCancel} onLoadError={() => onFailure('The artwork could not load into Unlayer. Try another image.')} onError={(error) => onFailure(`Unlayer could not start: ${error.message}`)} />;
}
