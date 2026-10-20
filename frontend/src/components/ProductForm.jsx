import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Input from './Input';
import Button from './Button';
import MultiImageUploader from './MultiImageUploader';

const schema = z.object({
  name:        z.string().min(1, 'Product name is required').max(150),
  description: z.string().max(500).optional().or(z.literal('')),
  price:       z.coerce
                 .number({ invalid_type_error: 'Price is required' })
                 .min(0.01, 'Price must be greater than 0'),
  stock:       z.coerce
                 .number({ invalid_type_error: 'Stock is required' })
                 .int('Stock must be a whole number')
                 .min(0, 'Stock cannot be negative'),
  category:    z.string().max(60).optional().or(z.literal('')),
});

/**
 * Shared product form used for Add and Edit modals.
 * @param {object}   defaultValues
 * @param {function} onSubmit(data, setError)
 * @param {boolean}  isSubmitting
 * @param {string}   submitLabel
 */
export default function ProductForm({
  defaultValues = {},
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Save',
}) {
  // imageUrls lives outside react-hook-form because it's managed by the uploader
  const [imageUrls, setImageUrls] = useState(() => {
    // Support both new imageUrls array and legacy single imageUrl
    if (Array.isArray(defaultValues.imageUrls) && defaultValues.imageUrls.length) {
      return [...defaultValues.imageUrls];
    }
    if (defaultValues.imageUrl) {
      return [defaultValues.imageUrl];
    }
    return [];
  });
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState('');

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '', description: '', price: '', stock: 0,
      category: '',
      ...defaultValues,
    },
  });

  const handleImageChange = (urlsOrFn) => {
    if (typeof urlsOrFn === 'function') {
      setImageUrls((prev) => {
        const next = urlsOrFn(prev);
        return next;
      });
    } else {
      setImageUrls(urlsOrFn);
    }
    setImageError('');
  };

  const handleFormSubmit = (data) => {
    // Validate images (min 1, max 5)
    if (imageUrls.length === 0) {
      setImageError('Please add at least 1 product photo (min 1, max 5)');
      return;
    }
    if (imageUrls.length > 5) {
      setImageError('A product can have a maximum of 5 photos');
      return;
    }
    if (imageUploading) {
      setImageError('Please wait for uploads to finish');
      return;
    }

    const cleaned = { ...data, imageUrls };
    // Remove old imageUrl field if present
    delete cleaned.imageUrl;
    ['description', 'category'].forEach((k) => {
      if (cleaned[k] === '') delete cleaned[k];
    });
    onSubmit(cleaned, setError);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate className="space-y-4">
      <Input
        id="product-name"
        label="Product name *"
        placeholder="e.g. Basmati Rice 5kg"
        error={errors.name?.message}
        {...register('name')}
      />

      {/* Description */}
      <div className="space-y-1.5">
        <label htmlFor="product-description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="product-description"
          rows={2}
          placeholder="Brief product description…"
          className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent placeholder:text-gray-400 resize-none
            ${errors.description ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
          {...register('description')}
        />
        {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          id="product-price"
          label="Price (₹) *"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="99.00"
          error={errors.price?.message}
          {...register('price')}
        />
        <Input
          id="product-stock"
          label="Stock *"
          type="number"
          min="0"
          step="1"
          placeholder="50"
          error={errors.stock?.message}
          {...register('stock')}
        />
      </div>

      <Input
        id="product-category"
        label="Category (optional)"
        placeholder="e.g. Pulses, Dairy…"
        error={errors.category?.message}
        {...register('category')}
      />

      {/* Multi-image uploader */}
      <MultiImageUploader
        value={imageUrls}
        onChange={handleImageChange}
        onUploadingChange={setImageUploading}
        error={imageError}
      />

      <Button
        id="product-form-submit-btn"
        type="submit"
        loading={isSubmitting}
        disabled={imageUploading}
        className="w-full py-3 text-base mt-1"
      >
        {submitLabel}
      </Button>
    </form>
  );
}
