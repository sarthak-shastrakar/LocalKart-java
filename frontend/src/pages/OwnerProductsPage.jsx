import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Package, Plus, Pencil, Trash2, AlertTriangle,
  RefreshCw
} from 'lucide-react';

import {
  getMyProducts,
  createProduct,
  updateProduct,
  deleteProduct
} from '../features/owner/ownerProductApi';

import ProductForm from '../components/ProductForm';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';
import Button from '../components/Button';
import { inr } from '../utils';

export default function OwnerProductsPage() {
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);

  // Submitting states
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const fetchProducts = useCallback(async (pageToLoad = 0) => {
    setLoading(true);
    try {
      const res = await getMyProducts({ page: pageToLoad, size: 10 });
      setProducts(res.data.items || []);
      setPage(res.data.page ?? pageToLoad);
      setTotalPages(res.data.totalPages ?? 0);
      setTotalItems(res.data.totalItems ?? 0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts(page);
  }, [fetchProducts, page]);

  // Handle Add Product
  const handleAddSubmit = async (data, setError) => {
    setFormSubmitting(true);
    try {
      await createProduct(data);
      toast.success('Product created successfully!');
      setIsAddOpen(false);
      fetchProducts(0);
    } catch (err) {
      if (err.response?.data?.errors && setError) {
        Object.entries(err.response.data.errors).forEach(([field, msg]) => {
          setError(field, { message: msg });
        });
      } else {
        toast.error(err.response?.data?.message || 'Failed to create product');
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Edit Product
  const handleEditSubmit = async (data, setError) => {
    if (!editingProduct) return;
    setFormSubmitting(true);
    try {
      await updateProduct(editingProduct.id, data);
      toast.success('Product updated successfully!');
      setEditingProduct(null);
      fetchProducts(page);
    } catch (err) {
      if (err.response?.data?.errors && setError) {
        Object.entries(err.response.data.errors).forEach(([field, msg]) => {
          setError(field, { message: msg });
        });
      } else {
        toast.error(err.response?.data?.message || 'Failed to update product');
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Delete (soft delete)
  const handleDeleteConfirm = async () => {
    if (!deletingProduct) return;
    const deletedId = deletingProduct.id;
    setDeleteSubmitting(true);
    try {
      await deleteProduct(deletedId);
      toast.success('Product deleted');
      setDeletingProduct(null);
      setProducts((prev) => prev.filter((p) => p.id !== deletedId));
      setTotalItems((prev) => Math.max(0, prev - 1));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete product');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Manage Products</h1>
            {!loading && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                {totalItems} {totalItems === 1 ? 'item' : 'items'}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Add, update pricing, manage inventory stock, and track your catalog.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            id="owner-refresh-products-btn"
            variant="secondary"
            onClick={() => fetchProducts(page)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
          <Button
            id="owner-add-product-btn"
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5"
          >
            <Plus size={18} />
            Add Product
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-200" />
                  <div className="space-y-2">
                    <div className="w-48 h-4 bg-gray-200 rounded" />
                    <div className="w-24 h-3 bg-gray-100 rounded" />
                  </div>
                </div>
                <div className="w-20 h-4 bg-gray-200 rounded" />
                <div className="w-28 h-8 bg-gray-200 rounded-lg" />
                <div className="w-16 h-8 bg-gray-200 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <EmptyState
            icon={<Package size={48} className="mx-auto text-gray-300" />}
            title="No products yet"
            description="Your store catalog is empty. Start adding items to begin selling to local shoppers."
          />
          <div className="text-center mt-4">
            <Button
              id="owner-add-first-product-btn"
              onClick={() => setIsAddOpen(true)}
              className="inline-flex items-center gap-2"
            >
              <Plus size={16} />
              Add Your First Product
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Product</th>
                  <th className="py-3.5 px-4">Price</th>
                  <th className="py-3.5 px-4">Stock</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {products.map((p) => {
                  const isLowStock = p.stock > 0 && p.stock <= 5;
                  const isOutOfStock = p.stock === 0;

                  return (
                    <tr
                      key={p.id}
                      className="transition-colors hover:bg-gray-50/70"
                    >
                      {/* Product details */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          {p.imageUrls?.[0] || p.imageUrl ? (
                            <img
                              src={p.imageUrls?.[0] || p.imageUrl}
                              alt={p.name}
                              className="w-12 h-12 rounded-xl object-cover border border-gray-100 flex-shrink-0"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&auto=format&fit=crop&q=60';
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center text-green-600 flex-shrink-0">
                              <Package size={22} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{p.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {p.category && (
                                <span className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-md">
                                  {p.category}
                                </span>
                              )}
                              {p.description && (
                                <p className="text-xs text-gray-400 truncate max-w-xs">
                                  {p.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="py-4 px-4 font-semibold text-gray-900 whitespace-nowrap">
                        {inr(p.price)}
                      </td>

                      {/* Stock */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {isOutOfStock ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-100 text-red-700">
                              <AlertTriangle size={12} />
                              Out of stock
                            </span>
                          ) : isLowStock ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-100 text-amber-700">
                              <AlertTriangle size={12} />
                              Low stock ({p.stock})
                            </span>
                          ) : (
                            <span className="text-xs text-gray-600 font-medium">
                              In stock ({p.stock})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingProduct(p)}
                            aria-label={`Edit ${p.name}`}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingProduct(p)}
                            aria-label={`Delete ${p.name}`}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-100">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={(newPage) => setPage(newPage)}
              />
            </div>
          )}
        </div>
      )}

      {/* Modal: Add Product */}
      {isAddOpen && (
        <Modal title="Add New Product" onClose={() => setIsAddOpen(false)}>
          <ProductForm
            onSubmit={handleAddSubmit}
            isSubmitting={formSubmitting}
            submitLabel="Create Product"
          />
        </Modal>
      )}

      {/* Modal: Edit Product */}
      {editingProduct && (
        <Modal
          title={`Edit "${editingProduct.name}"`}
          onClose={() => setEditingProduct(null)}
        >
          <ProductForm
            defaultValues={{
              name: editingProduct.name,
              description: editingProduct.description || '',
              price: editingProduct.price,
              stock: editingProduct.stock,
              category: editingProduct.category || '',
              imageUrls: editingProduct.imageUrls || (editingProduct.imageUrl ? [editingProduct.imageUrl] : []),
            }}
            onSubmit={handleEditSubmit}
            isSubmitting={formSubmitting}
            submitLabel="Save Changes"
          />
        </Modal>
      )}

      {/* Modal: Delete Confirmation */}
      {deletingProduct && (
        <Modal
          title="Delete Product"
          onClose={() => setDeletingProduct(null)}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-red-50 text-red-800 rounded-xl border border-red-100">
              <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-red-900">Delete this product? Customers will no longer see it.</p>
                {deletingProduct.name && (
                  <p className="text-xs text-red-600 mt-1 font-medium">
                    &ldquo;{deletingProduct.name}&rdquo;
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDeletingProduct(null)}
                disabled={deleteSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleDeleteConfirm}
                loading={deleteSubmitting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Yes, Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
