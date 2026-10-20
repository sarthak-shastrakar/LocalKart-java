import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, ImageIcon, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Spinner from './Spinner';
import { uploadImage } from '../features/uploads/uploadApi';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 3 * 1024 * 1024;

/**
 * Single image uploader with drag-and-drop, preview, and remove.
 * @param {{ type: 'product'|'store', value?: string|null, onChange: (url: string|null) => void, onUploadingChange?: (uploading: boolean) => void, label?: string, id?: string }} props
 */
export default function ImageUploader({
  type,
  value = null,
  onChange,
  onUploadingChange,
  label = 'Upload image',
  id = 'image-uploader',
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading]); // eslint-disable-line react-hooks/exhaustive-deps

  const validate = (file) => {
    if (!ACCEPTED.includes(file.type)) {
      return 'Only JPG, PNG, or WEBP images are allowed';
    }
    if (file.size > MAX_BYTES) {
      return 'Image must be 3 MB or smaller';
    }
    return null;
  };

  const handleUpload = useCallback(async (file) => {
    const err = validate(file);
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setUploading(true);
    try {
      const res = await uploadImage(file, type);
      onChange(res.data.url);
    } catch (e) {
      const msg = e.response?.data?.message || 'Upload failed. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  }, [type, onChange]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    // reset so same file can be re-selected
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleRemove = () => {
    onChange(null);
    setError('');
  };

  // Preview state
  if (value) {
    return (
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="relative inline-block group">
          <img
            src={value}
            alt="Uploaded preview"
            loading="lazy"
            className="w-32 h-32 rounded-xl object-cover border border-gray-200"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '';
              e.target.alt = 'Image failed to load';
            }}
          />
          <button
            type="button"
            onClick={handleRemove}
            aria-label="Remove image"
            className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white shadow hover:bg-red-600 transition opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        disabled={uploading}
        className={`w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed transition-colors cursor-pointer text-sm
          ${dragOver
            ? 'border-green-400 bg-green-50'
            : 'border-gray-200 bg-gray-50 hover:border-green-300 hover:bg-green-50/50'}
          ${uploading ? 'opacity-60 cursor-wait' : ''}
        `}
      >
        {uploading ? (
          <>
            <Spinner size="sm" />
            <span className="text-gray-500 font-medium">Uploading…</span>
          </>
        ) : (
          <>
            <Upload size={24} className="text-gray-400" />
            <span className="text-gray-500 font-medium">Click or drag an image here</span>
            <span className="text-xs text-gray-400">JPG, PNG, or WEBP · Max 3 MB</span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="sr-only"
        aria-label={label}
      />
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
}
