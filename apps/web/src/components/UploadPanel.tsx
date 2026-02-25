import type { RecognitionEngine } from '../state/use-pipeline';

interface UploadPanelProps {
  templateFile?: File | undefined;
  clientFile?: File | undefined;
  recognitionEngine: RecognitionEngine;
  onTemplateSelect: (file?: File | undefined) => void;
  onClientSelect: (file?: File | undefined) => void;
  onRecognitionEngineChange: (engine: RecognitionEngine) => void;
}

export const UploadPanel = (props: UploadPanelProps) => {
  return (
    <section className="card upload-panel">
      <h2>Upload Documents</h2>
      <div className="form-row">
        <label className="form-control">
          <span className="form-control-label">Blank Template PDF</span>
          <input
            className="file-input"
            type="file"
            accept="application/pdf"
            onChange={(e) => props.onTemplateSelect(e.target.files?.[0])}
          />
          <span className="form-control-hint">Upload a blank AcroForm or flat template PDF.</span>
          <span className="file-selection">
            {props.templateFile?.name ?? 'No template selected'}
          </span>
        </label>
        <label className="form-control">
          <span className="form-control-label">Client Completed Docs (PDF, JPG, PNG)</span>
          <input
            className="file-input"
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            onChange={(e) => props.onClientSelect(e.target.files?.[0])}
          />
          <span className="form-control-hint">You can select one file at once.</span>
          <span className="file-selection">
            {props.clientFile?.name ?? 'No client file selected'}
          </span>
        </label>
      </div>
      <label className="form-control">
        <span className="form-control-label">Recognition Engine</span>
        <select
          className="select-input"
          value={props.recognitionEngine}
          onChange={(e) => props.onRecognitionEngineChange(e.target.value as RecognitionEngine)}
        >
          <option value="gemini">Gemini</option>
          <option value="tesseract">Tesseract</option>
        </select>
        <span className="form-control-hint">
          Gemini usually resolves more handwritten fields; Tesseract is local OCR.
        </span>
      </label>
    </section>
  );
};
