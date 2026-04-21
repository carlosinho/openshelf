import Papa from 'papaparse'
import { PocketItem } from '../types/pocket'

const REQUIRED_HEADERS = ['title', 'url', 'time_added', 'tags', 'status']

export function exportToPocketCSV(items: PocketItem[], filename: string = 'openshelf-export.csv'): void {
  const csvData = items.map(item => ({
    title: item.title,
    url: item.url,
    time_added: item.time_added,
    tags: item.tags,
    status: item.status
  }))
  
  const csv = Papa.unparse(csvData, {
    header: true,
    columns: REQUIRED_HEADERS
  })
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
} 