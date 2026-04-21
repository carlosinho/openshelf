import { useMemo } from "react"

interface UsePaginationProps {
  currentPage: number
  totalPages: number
  paginationItemsToDisplay?: number
}

interface UsePaginationReturn {
  pages: number[]
  showLeftEllipsis: boolean
  showRightEllipsis: boolean
}

export function usePagination({
  currentPage,
  totalPages,
  paginationItemsToDisplay = 5,
}: UsePaginationProps): UsePaginationReturn {
  return useMemo(() => {
    if (totalPages <= paginationItemsToDisplay) {
      return {
        pages: Array.from({ length: totalPages }, (_, i) => i + 1),
        showLeftEllipsis: false,
        showRightEllipsis: false,
      }
    }

    const sidePages = Math.floor((paginationItemsToDisplay - 1) / 2)
    const startPage = Math.max(1, currentPage - sidePages)
    const endPage = Math.min(totalPages, currentPage + sidePages)

    const pages: number[] = []
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }

    const showLeftEllipsis = startPage > 2
    const showRightEllipsis = endPage < totalPages - 1

    return {
      pages,
      showLeftEllipsis,
      showRightEllipsis,
    }
  }, [currentPage, totalPages, paginationItemsToDisplay])
} 