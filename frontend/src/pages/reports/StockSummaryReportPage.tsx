import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import dayjs from 'dayjs'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import MailOutlineIcon from '@mui/icons-material/MailOutline'
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import { listProducts } from '@/api/products'
import { useToastStore } from '@/store/uiStore'
import { formatCurrencyPrecise } from '@/utils/format'
import { isFavourite, setFavourite } from '@/utils/reportFavourites'
import { brand } from '@/theme/theme'

const REPORT_SLUG = 'stock-summary'

export function StockSummaryReportPage() {
  const navigate = useNavigate()
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()

  const [favourite, setFavouriteState] = useState(() => isFavourite(REPORT_SLUG))
  const [category, setCategory] = useState('all')
  const [asOfDate, setAsOfDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null)

  const { data: products = [], isLoading } = useQuery({ queryKey: ['products'], queryFn: listProducts })

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter((c): c is string => !!c))).sort(),
    [products],
  )

  const rows = useMemo(() => {
    return products
      .filter((p) => category === 'all' || p.category === category)
      .map((p) => {
        const purchasePrice = p.purchase_price != null ? Number(p.purchase_price) : Number(p.rate)
        return {
          id: p.id,
          name: p.name,
          batch_no: p.batch_no,
          sku: p.sku,
          purchasePrice,
          sellingPrice: Number(p.rate),
          quantity: p.current_stock,
          unit: p.unit.toUpperCase(),
          stockValue: purchasePrice * p.current_stock,
        }
      })
  }, [products, category])

  const totals = useMemo(
    () => ({
      value: rows.reduce((s, r) => s + r.stockValue, 0),
      quantity: rows.reduce((s, r) => s + r.quantity, 0),
    }),
    [rows],
  )

  const toggleFavourite = () => {
    setFavouriteState((prev) => {
      setFavourite(REPORT_SLUG, !prev)
      return !prev
    })
  }

  const handleDownloadExcel = () => {
    const sheetRows = rows.map((r) => ({
      'Item Name': r.name,
      'Batch Number': r.batch_no ?? '-',
      'Item Code': r.sku ?? '-',
      'Purchase Price': r.purchasePrice,
      'Selling Price': r.sellingPrice,
      'Stock Quantity': `${r.quantity.toFixed(1)} ${r.unit}`,
      'Stock Value': r.stockValue,
    }))
    const worksheet = XLSX.utils.json_to_sheet(sheetRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Summary')
    XLSX.writeFile(workbook, `stock-summary-${asOfDate}.xlsx`)
    toast('Stock summary downloaded')
  }

  const handlePrintPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(14)
    doc.text('Stock Summary', 14, 15)
    doc.setFontSize(9)
    doc.setTextColor(120)
    doc.text(`As of ${dayjs(asOfDate).format('D MMM YYYY')}`, 14, 21)

    autoTable(doc, {
      startY: 27,
      head: [['Item Name', 'Batch Number', 'Item Code', 'Purchase Price', 'Selling Price', 'Stock Quantity', 'Stock Value']],
      body: rows.map((r) => [
        r.name,
        r.batch_no ?? '-',
        r.sku ?? '-',
        formatCurrencyPrecise(r.purchasePrice),
        formatCurrencyPrecise(r.sellingPrice),
        `${r.quantity.toFixed(1)} ${r.unit}`,
        formatCurrencyPrecise(r.stockValue),
      ]),
      foot: [['', '', '', '', 'Total', `${totals.quantity.toFixed(1)}`, formatCurrencyPrecise(totals.value)]],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [63, 174, 125] },
      footStyles: { fillColor: [238, 241, 245], textColor: [20, 20, 20], fontStyle: 'bold' },
    })
    doc.save(`stock-summary-${asOfDate}.pdf`)
    toast('Stock summary PDF generated')
  }

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <IconButton size="small" onClick={() => navigate('/reports')}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Typography variant="h5" fontWeight={600}>
            Stock Summary
          </Typography>
          <Chip
            size="small"
            variant="outlined"
            icon={favourite ? <StarIcon sx={{ fontSize: 16, color: brand.warning }} /> : <StarBorderIcon sx={{ fontSize: 16 }} />}
            label="Favourite"
            onClick={toggleFavourite}
            sx={{ fontWeight: 600 }}
          />
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<MailOutlineIcon />} onClick={() => toast('Email delivery is coming soon', 'info')}>
            Email Excel
          </Button>
          <Button variant="outlined" startIcon={<FileDownloadOutlinedIcon />} onClick={handleDownloadExcel}>
            Download Excel
          </Button>
          <Tooltip title="Stock is valued at purchase price × current stock quantity, as of now. Historical snapshots by date aren't tracked yet.">
            <IconButton size="small" sx={{ border: '1px solid', borderColor: 'divider' }}>
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <IconButton size="small" sx={{ border: '1px solid', borderColor: 'divider' }} onClick={(e) => setMoreAnchor(e.currentTarget)}>
            <ArrowDropDownIcon fontSize="small" />
          </IconButton>
          <Menu anchorEl={moreAnchor} open={!!moreAnchor} onClose={() => setMoreAnchor(null)}>
            <MenuItem
              onClick={() => {
                setMoreAnchor(null)
                queryClient.invalidateQueries({ queryKey: ['products'] })
                toast('Stock summary refreshed')
              }}
            >
              Refresh data
            </MenuItem>
          </Menu>
          <Button variant="contained" startIcon={<PrintOutlinedIcon />} onClick={handlePrintPdf}>
            Print PDF
          </Button>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        <Card variant="outlined" sx={{ minWidth: 220 }}>
          <CardContent>
            <Typography variant="caption" fontWeight={500} color="primary">
              Total Stock Value
            </Typography>
            <Typography variant="h5" fontWeight={600} fontFamily="'JetBrains Mono',monospace">
              ₹{totals.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ minWidth: 220 }}>
          <CardContent>
            <Typography variant="caption" fontWeight={500} color="text.secondary">
              Total Stock Quantity
            </Typography>
            <Typography variant="h5" fontWeight={600} fontFamily="'JetBrains Mono',monospace">
              {totals.quantity.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      <Stack direction="row" spacing={1.5} alignItems="center">
        <TextField size="small" select label="Search Category" value={category} onChange={(e) => setCategory(e.target.value)} sx={{ minWidth: 200 }}>
          <MenuItem value="all">All categories</MenuItem>
          {categories.map((c) => (
            <MenuItem key={c} value={c}>
              {c}
            </MenuItem>
          ))}
        </TextField>
        <Tooltip title="Historical stock snapshots aren't tracked yet — this shows current stock regardless of date">
          <TextField
            size="small"
            type="date"
            label="As of"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 170 }}
          />
        </Tooltip>
      </Stack>

      <Card variant="outlined" sx={{ overflow: 'hidden' }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Item Name</TableCell>
                <TableCell>Batch Number</TableCell>
                <TableCell>Item Code</TableCell>
                <TableCell align="right">Purchase Price</TableCell>
                <TableCell align="right">Selling Price</TableCell>
                <TableCell align="right">Stock Quantity</TableCell>
                <TableCell align="right">Stock Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    {isLoading ? 'Loading…' : 'No items found'}
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>
                    <Typography color="primary" fontWeight={600} fontSize={13.5}>
                      {r.name}
                    </Typography>
                  </TableCell>
                  <TableCell>{r.batch_no ?? '-'}</TableCell>
                  <TableCell>{r.sku ?? '-'}</TableCell>
                  <TableCell align="right">₹{r.purchasePrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</TableCell>
                  <TableCell align="right">₹{r.sellingPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</TableCell>
                  <TableCell align="right">
                    {r.quantity.toFixed(1)} {r.unit}
                  </TableCell>
                  <TableCell align="right">₹{r.stockValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Card>
    </Stack>
  )
}
