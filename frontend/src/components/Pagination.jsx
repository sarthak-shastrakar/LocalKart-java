import Button from './Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <Button
        id="pagination-prev-btn"
        variant="secondary"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 0}
        className="px-3 py-2"
      >
        <ChevronLeft size={16} />
      </Button>
      <span className="text-sm text-gray-600 font-medium px-2">
        Page {page + 1} of {totalPages}
      </span>
      <Button
        id="pagination-next-btn"
        variant="secondary"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages - 1}
        className="px-3 py-2"
      >
        <ChevronRight size={16} />
      </Button>
    </div>
  );
}
