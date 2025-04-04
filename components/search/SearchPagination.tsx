'use client';

import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious, 
  PaginationEllipsis 
} from '@/components/ui/pagination';
import { PaginationInfo } from '@/types/search';

interface SearchPaginationProps {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
}

export function SearchPagination({ pagination, onPageChange }: SearchPaginationProps) {
  const { currentPage, totalPages, hasNextPage, hasPreviousPage } = pagination;
  
  // Generate array of page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    
    // Always show first page
    pages.push(1);
    
    // Calculate start and end of the central page range
    let startPage = Math.max(2, currentPage - 1);
    let endPage = Math.min(totalPages - 1, currentPage + 1);
    
    // Adjust the range for edge cases
    if (currentPage <= 3) {
      endPage = Math.min(4, totalPages - 1);
    } else if (currentPage >= totalPages - 2) {
      startPage = Math.max(2, totalPages - 3);
    }
    
    // Add ellipsis after first page if there's a gap
    if (startPage > 2) {
      pages.push('ellipsis-start');
    }
    
    // Add the central range of pages
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    // Add ellipsis before last page if there's a gap
    if (endPage < totalPages - 1) {
      pages.push('ellipsis-end');
    }
    
    // Always show last page if there's more than one page
    if (totalPages > 1) {
      pages.push(totalPages);
    }
    
    return pages;
  };
  
  // Only show pagination if we have multiple pages
  if (totalPages <= 1) {
    return null;
  }
  
  const pageNumbers = getPageNumbers();
  
  return (
    <Pagination className="my-8">
      <PaginationContent>
        {/* Previous page button */}
        <PaginationItem>
          <PaginationPrevious 
            onClick={() => onPageChange(currentPage - 1)}
            style={{ cursor: hasPreviousPage ? 'pointer' : 'not-allowed' }}
            className={!hasPreviousPage ? 'opacity-50 pointer-events-none' : ''}
          />
        </PaginationItem>
        
        {/* Page number buttons */}
        {pageNumbers.map((page, index) => {
          if (page === 'ellipsis-start' || page === 'ellipsis-end') {
            return (
              <PaginationItem key={`ellipsis-${index}`}>
                <PaginationEllipsis />
              </PaginationItem>
            );
          }
          
          const pageNum = page as number;
          return (
            <PaginationItem key={pageNum}>
              <PaginationLink
                isActive={pageNum === currentPage}
                onClick={() => onPageChange(pageNum)}
                style={{ cursor: 'pointer' }}
              >
                {pageNum}
              </PaginationLink>
            </PaginationItem>
          );
        })}
        
        {/* Next page button */}
        <PaginationItem>
          <PaginationNext 
            onClick={() => onPageChange(currentPage + 1)}
            style={{ cursor: hasNextPage ? 'pointer' : 'not-allowed' }}
            className={!hasNextPage ? 'opacity-50 pointer-events-none' : ''}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}