import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle } from 'lucide-react';

import Input from './Input';
import Button from './Button';
import TimePicker from './TimePicker';
import ImageUploader from './ImageUploader';
import LocationPicker from './LocationPicker';
import { CATEGORY_META } from '../utils';

const CATEGORIES = Object.entries(CATEGORY_META).map(([value, { label }]) => ({ value, label }));

const schema = z.object({
  name:        z.string().min(1, 'Store name is required').max(150),
  description: z.string().max(500).optional().or(z.literal('')),
  category:    z.enum(['GROCERY', 'MEDICAL', 'BAKERY', 'ELECTRONICS', 'VEGETABLES', 'OTHER'], {
    required_error: 'Please select a category',
  }),
  address:     z.string().min(1, 'Address is required').max(300),
  pincode:     z.string().regex(/^\d{6}$/, 'Pincode must be exactly 6 digits'),
  latitude:    z.coerce
                 .number({ invalid_type_error: 'Please set your store location' })
                 .min(-90).max(90),
  longitude:   z.coerce
                 .number({ invalid_type_error: 'Please set your store location' })
                 .min(-180).max(180),
  openTime:    z.string().optional().or(z.literal('')),
  closeTime:   z.string().optional().or(z.literal('')),
});

/**
 * Shared store form for both create and edit.
 * @param {{ defaultValues?: object, onSubmit: Function, isSubmitting?: boolean, submitLabel?: string }} props
 */
export default function StoreForm({
  defaultValues = {},
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Save',
}) {
  // Logo lives outside react-hook-form — managed by ImageUploader
  const [logoUrl, setLogoUrl] = useState(defaultValues.logoUrl || '');
  const [logoUploading, setLogoUploading] = useState(false);

  // Location note: when reverse geocode returns no pincode, show hint
  const [pincodeMissing, setPincodeMissing] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '', description: '', category: '', address: '',
      pincode: '', latitude: '', longitude: '',
      openTime: '09:00', closeTime: '21:00',
      ...defaultValues,
    },
  });

  // ── LocationPicker callback ─────────────────────────────────────────────
  const handleLocationChange = useCallback(
    ({ lat, lng, address, pincode }) => {
      setValue('latitude',  lat,     { shouldValidate: true });
      setValue('longitude', lng,     { shouldValidate: true });
      setValue('address',   address, { shouldValidate: true });
      if (pincode) {
        setValue('pincode', pincode, { shouldValidate: true });
        setPincodeMissing(false);
      } else {
        setPincodeMissing(true);
      }
    },
    [setValue]
  );

  // ── Form submit ─────────────────────────────────────────────────────────
  const handleFormSubmit = (data) => {
    const cleaned = { ...data };
    if (logoUrl) cleaned.logoUrl = logoUrl;
    ['description', 'openTime', 'closeTime'].forEach((k) => {
      if (cleaned[k] === '') delete cleaned[k];
    });
    onSubmit(cleaned, setError);
  };

  // Extract initial coords for the map (edit mode)
  const initLat = defaultValues.latitude != null ? Number(defaultValues.latitude) : undefined;
  const initLng = defaultValues.longitude != null ? Number(defaultValues.longitude) : undefined;

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate className="space-y-6">
      {/* Hidden lat/lng – still required by schema, set by LocationPicker */}
      <input type="hidden" {...register('latitude')}  />
      <input type="hidden" {...register('longitude')} />

      {/* ── Name ──────────────────────────────────────────────────── */}
      <Input
        id="store-name"
        label="Store name *"
        placeholder="e.g. Ravi Kirana Store"
        error={errors.name?.message}
        {...register('name')}
      />

      {/* ── Description ───────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <label htmlFor="store-description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="store-description"
          rows={3}
          placeholder="Briefly describe your store…"
          className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none
            focus:ring-2 focus:ring-green-400 focus:border-transparent placeholder:text-gray-400 resize-none
            ${errors.description ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
          {...register('description')}
        />
        {errors.description && (
          <p className="text-xs text-red-500">{errors.description.message}</p>
        )}
      </div>

      {/* ── Category ──────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <label htmlFor="store-category" className="block text-sm font-medium text-gray-700">
          Category *
        </label>
        <select
          id="store-category"
          className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2
            focus:ring-green-400 focus:border-transparent bg-white
            ${errors.category ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
          {...register('category')}
        >
          <option value="">Select a category</option>
          {CATEGORIES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        {errors.category && (
          <p className="text-xs text-red-500">{errors.category.message}</p>
        )}
      </div>

      {/* ── Location picker (map + GPS + search) ──────────────────── */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">Location *</label>
        <LocationPicker
          initialLat={initLat}
          initialLng={initLng}
          onChange={handleLocationChange}
        />
        {/* lat / lng validation errors – shown below the map */}
        {(errors.latitude || errors.longitude) && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle size={12} />
            {errors.latitude?.message || errors.longitude?.message || 'Please set your store location'}
          </p>
        )}
      </div>

      {/* ── Address ───────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Input
          id="store-address"
          label="Address *"
          placeholder="123, MG Road, Delhi"
          error={errors.address?.message}
          {...register('address')}
        />
        <p className="text-xs text-gray-400">
          Auto-filled from the map — edit if needed.
        </p>
      </div>

      {/* ── Pincode ───────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Input
          id="store-pincode"
          label="Pincode * (6 digits)"
          placeholder="110001"
          maxLength={6}
          error={errors.pincode?.message}
          {...register('pincode')}
        />
        {pincodeMissing && !errors.pincode && (
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <AlertCircle size={12} />
            Pincode wasn&#39;t detected automatically — please enter it.
          </p>
        )}
      </div>

      {/* ── Hours ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TimePicker
          id="store-open-time"
          label="Opening Time"
          value={watch('openTime') || '09:00'}
          onChange={(val) => setValue('openTime', val, { shouldValidate: true })}
          error={errors.openTime?.message}
          presets={['07:00', '08:00', '09:00', '10:00']}
          defaultHour="09"
          defaultPeriod="AM"
        />
        <TimePicker
          id="store-close-time"
          label="Closing Time"
          value={watch('closeTime') || '21:00'}
          onChange={(val) => setValue('closeTime', val, { shouldValidate: true })}
          error={errors.closeTime?.message}
          presets={['19:00', '20:00', '21:00', '22:00']}
          defaultHour="09"
          defaultPeriod="PM"
        />
      </div>

      {/* ── Store Logo ────────────────────────────────────────────── */}
      <ImageUploader
        type="store"
        value={logoUrl || null}
        onChange={(url) => setLogoUrl(url || '')}
        onUploadingChange={setLogoUploading}
        label="Store Logo (optional)"
        id="store-logo-upload"
      />

      <Button
        id="store-form-submit-btn"
        type="submit"
        loading={isSubmitting}
        disabled={logoUploading || isSubmitting}
        className="w-full py-3 text-base"
      >
        {submitLabel}
      </Button>
    </form>
  );
}
