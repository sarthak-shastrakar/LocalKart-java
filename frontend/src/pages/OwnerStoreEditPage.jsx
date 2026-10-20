import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';

import { getMyStore, updateStore } from '../features/owner/ownerStoreApi';
import StoreForm from '../components/StoreForm';
import Spinner from '../components/Spinner';

export default function OwnerStoreEditPage() {
  const navigate = useNavigate();
  const [store, setStore]         = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    getMyStore()
      .then((res) => setStore(res.data))
      .catch((err) => {
        if (err.response?.status === 404) {
          toast.error('You don\'t have a store yet.');
          navigate('/owner');
        } else {
          toast.error('Failed to load store data.');
        }
      })
      .finally(() => setPageLoading(false));
  }, [navigate]);

  const handleUpdate = async (data, setError) => {
    setSaving(true);
    try {
      const res = await updateStore(data);
      setStore(res.data);
      toast.success('Store updated successfully!');
      navigate('/owner');
    } catch (err) {
      const status = err.response?.status;
      const body   = err.response?.data;
      if (status === 400 && body?.errors) {
        Object.entries(body.errors).forEach(([f, msg]) => setError(f, { message: msg }));
      } else {
        toast.error(body?.message || 'Could not update store.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!store) return null;

  // Prefill form — convert numeric lat/lng to strings for inputs,
  // keep time values as-is ("HH:mm")
  const defaultValues = {
    name:        store.name        ?? '',
    description: store.description ?? '',
    category:    store.category    ?? '',
    address:     store.address     ?? '',
    pincode:     store.pincode     ?? '',
    latitude:    store.latitude    != null ? String(store.latitude)  : '',
    longitude:   store.longitude   != null ? String(store.longitude) : '',
    openTime:    store.openTime    ?? '',
    closeTime:   store.closeTime   ?? '',
    logoUrl:     store.logoUrl     ?? '',
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        to="/owner"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-600 transition-colors font-medium"
      >
        <ArrowLeft size={15} /> Back to dashboard
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-800">Edit your store</h1>
        <p className="text-sm text-gray-500 mt-1">
          Update your store details. Changes are saved immediately.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8">
        <StoreForm
          defaultValues={defaultValues}
          submitLabel="Save Changes"
          isSubmitting={saving}
          onSubmit={handleUpdate}
        />
      </div>
    </div>
  );
}
