import { useState, useRef, useCallback, useEffect } from 'react';
import { Plus, X, ChevronLeft, ChevronRight, Upload, AlertCircle, ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import Spinner from './Spinner';
import { uploadImage } from '../features/uploads/uploadApi';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 3 * 1024 * 1024;
const MAX_IMAGES = 5;

/**
 * Multi-image uploader for products (1–5 images).
 * @param {{ value: string[], onChange: (urls: string[]) => void, onUploadingChange?: (uploading: boolean) => void, error?: string }} props
 */
export default function MultiImageUploader({ value = [], onChange, onUploadingChange, error: externalError }) {
  const [uploadingCount, setUploadingCount] = useState(0);
  const [errors, setErrors] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const isUploading = uploadingCount > 0;

  useEffect(() => {
    onUploadingChange?.(isUploading);
  }, [isUploading]); // eslint-disable-line react-hooks/exhaustive-deps

  const validate = (file) => {
    if (!ACCEPTED.includes(file.type)) {
      return `"${file.name}" is not a supported image. Use JPG, PNG, or WEBP.`;
    }
    if (file.size > MAX_BYTES) {
      return `"${file.name}" is too large. Max 3 MB.`;
    }
    return null;
  };

  const handleFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList);
    const currentCount = value.length;
    const remaining = MAX_IMAGES - currentCount;

    if (remaining <= 0) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    // Only take files up to remaining slots
    const toUpload = files.slice(0, remaining);
    if (files.length > remaining) {
      toast(`Only ${remaining} more image${remaining === 1 ? '' : 's'} allowed. Extra files ignored.`, { icon: '⚠️' });
    }

    const newErrors = [];

    for (const file of toUpload) {
      const err = validate(file);
      if (err) {
        newErrors.push(err);
        continue;
      }

      setUploadingCount((c) => c + 1);
      try {
        const res = await uploadImage(file, 'product');
        // Use functional update so concurrent uploads don't clobber each other
        onChange((prev) => {
          const arr = Array.isArray(prev) ? prev : value;
          if (arr.length >= MAX_IMAGES) return arr;
          return [...arr, res.data.url];
        });
      } catch (e) {
        const msg = e.response?.data?.message || `Failed to upload "${file.name}"`;
        newErrors.push(msg);
        toast.error(msg);
      } finally {
        setUploadingCount((c) => c - 1);
      }
    }

    if (newErrors.length) setErrors(newErrors);
    else setErrors([]);
  }, [value, onChange]);

  const handleFileChange = (e) => {
    if (e.target.files?.length) handleFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  const handleRemove = (index) => {
    const next = value.filter((_, i) => i !== index);
    onChange(next);
    setErrors([]);
  };

  const handleMoveLeft = (index) => {
    if (index === 0) return;
    const next = [...value];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  };

  const handleMoveRight = (index) => {
    if (index === value.length - 1) return;
    const next = [...value];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  };

  const canAdd = value.length < MAX_IMAGES && !isUploading;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Product photos *
        </label>
        <span className="text-xs text-gray-400 font-medium">{value.length}/{MAX_IMAGES}</span>
      </div>

      {/* If 0 photos: Prominent upload dropzone from system */}
      {value.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          disabled={isUploading}
          className={`w-full py-8 px-4 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all cursor-pointer text-center
            ${dragOver
              ? 'border-green-500 bg-green-50'
              : 'border-gray-200 bg-gray-50 hover:border-green-400 hover:bg-green-50/40'}
            ${isUploading ? 'opacity-60 cursor-wait' : ''}
          `}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Spinner size="md" />
              <span className="text-sm font-semibold text-gray-600">Uploading photos from your system…</span>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <Upload size={22} />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-gray-800">
                  Upload photos from your computer / system
                </p>
                <p className="text-xs text-gray-500">
                  Click to browse files or drag & drop here (JPG, PNG, WEBP · Max 3 MB · 1 to 5 images)
                </p>
              </div>
            </>
          )}
        </button>
      ) : (
        /* Image grid with thumbnails & add more */
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {value.map((url, i) => (
            <div
              key={`${url}-${i}`}
              className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50"
            >
              <img
                src={url}
                alt={i === 0 ? 'Main product photo' : `Product photo ${i + 1}`}
                loading="lazy"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '';
                }}
              />

              {/* "Main" badge on first */}
              {i === 0 && (
                <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-600 text-white shadow">
                  Main
                </span>
              )}

              {/* Overlay controls */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end justify-center gap-1 p-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                <button
                  type="button"
                  onClick={() => handleMoveLeft(i)}
                  disabled={i === 0}
                  aria-label={`Move photo ${i + 1} left`}
                  className="p-1 rounded bg-white/90 text-gray-700 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(i)}
                  aria-label={`Remove photo ${i + 1}`}
                  className="p-1 rounded bg-red-500 text-white hover:bg-red-600 transition"
                >
                  <X size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveRight(i)}
                  disabled={i === value.length - 1}
                  aria-label={`Move photo ${i + 1} right`}
                  className="p-1 rounded bg-white/90 text-gray-700 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ))}

          {/* Uploading indicator slots */}
          {Array.from({ length: uploadingCount }).map((_, i) => (
            <div key={`uploading-${i}`} className="aspect-square rounded-xl border-2 border-dashed border-green-300 bg-green-50 flex items-center justify-center">
              <Spinner size="sm" />
            </div>
          ))}

          {/* Add more button */}
          {canAdd && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer
                ${dragOver
                  ? 'border-green-400 bg-green-50'
                  : 'border-gray-200 bg-gray-50 hover:border-green-300 hover:bg-green-50/50'}
              `}
              aria-label="Add product photo"
            >
              <Plus size={20} className="text-gray-400" />
              <span className="text-[10px] text-gray-500 font-medium">Add more</span>
            </button>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFileChange}
        className="sr-only"
        aria-label="Upload product photos"
      />

      {/* Errors */}
      {(externalError || errors.length > 0) && (
        <div className="space-y-0.5">
          {externalError && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle size={12} /> {externalError}
            </p>
          )}
          {errors.map((err, i) => (
            <p key={i} className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle size={12} /> {err}
            </p>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400">
        JPG, PNG, or WEBP · Max 3 MB each · 1 to 5 images (first image is main thumbnail)
      </p>
    </div>
  );
}
