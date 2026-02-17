import { useRef } from 'react';

import type { RecognitionEngine } from '../state/use-pipeline';

interface UploadPanelProps {
  templateFile?: File | undefined;
  clientFiles: File[];
  recognitionEngine: RecognitionEngine;
  onTemplateSelect: (file?: File | undefined) => void;
  onClientSelect: (files: File[]) => void;
  onRecognitionEngineChange: (engine: RecognitionEngine) => void;
  onLoadFieldTest: () => Promise<void>;
}

export const UploadPanel = (props: UploadPanelProps) => {
  const clientInputRef = useRef<HTMLInputElement>(null);

  return (
    <section className="card">
      <h2>Upload Documents</h2>
      <label>
        Blank Template PDF
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => props.onTemplateSelect(e.target.files?.[0])}
        />
      </label>
      <label>
        Client Completed Docs (PDF, JPG, PNG)
        <input
          ref={clientInputRef}
          type="file"
          accept="application/pdf,image/png,image/jpeg"
          multiple
          onChange={(e) => props.onClientSelect(Array.from(e.target.files ?? []))}
        />
      </label>
      <label>
        Recognition Engine
        <select
          value={props.recognitionEngine}
          onChange={(e) => props.onRecognitionEngineChange(e.target.value as RecognitionEngine)}
        >
          <option value="gemini">Gemini</option>
          <option value="tesseract">Tesseract</option>
        </select>
      </label>
      <div className="actions">
        <button type="button" onClick={() => void props.onLoadFieldTest()}>
          Use Field Test Files
        </button>
        <button type="button" onClick={() => clientInputRef.current?.click()}>
          Add More Client Files
        </button>
      </div>
      <ul>
        <li>Template: {props.templateFile?.name ?? 'None selected'}</li>
        <li>Client files: {props.clientFiles.length}</li>
      </ul>
    </section>
  );
};
