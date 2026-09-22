import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import { listProducts } from '@/api/products'
import { isFavourite, setFavourite } from '@/utils/reportFavourites'
import { brand } from '@/theme/theme'

const REPORT_SLUG = 'low-stock-summary'

export function LowStockSummaryReportPage() {
  const navigate = useNavigate()
  const [favourite, setFavouriteState] = useState(() => isFavourite(REPORT_SLUG))

  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: listProducts })

  const rows = useMemo(() => {
    return products
      .filter((p) => p.is_low_stock)
      .map((p) => {
        const purchasePrice = p.purchase_price != null ? Number(p.purchase_price) : Number(p.rate)
        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          quantity: p.current_stock,
          unit: p.unit.toUpperCase(),
          reorderLevel: p.reorder_level,
          stockValue: purchasePrice * p.current_stock,
        }
      })
  }, [products])

  const totalStockValue = useMemo(() => rows.reduce((s, r) => s + r.stockValue, 0), [rows])

  const toggleFavourite = () => {
    setFavouriteState((prev) => {
      setFavourite(REPORT_SLUG, !prev)
      return !prev
    })
  }

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <IconButton size="small" onClick={() => navigate('/reports')}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="h5" fontWeight={600}>
          Low Stock Summary
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

      <Card variant="outlined">
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Typography component="span" fontWeight={500} color="text.secondary">
            Total Stock Value:{' '}
          </Typography>
          <Typography component="span" fontWeight={500} color="success.main">
            ₹{totalStockValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </Typography>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ overflow: 'hidden' }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Item Name</TableCell>
                <TableCell>Item Code</TableCell>
                <TableCell align="right">Stock Quantity</TableCell>
                <TableCell align="right">Low Stock Level</TableCell>
                <TableCell align="right">Stock Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} sx={{ border: 0 }}>
                    <Stack spacing={1.5} alignItems="center" textAlign="center" sx={{ py: 8 }}>
                      <Inventory2OutlinedIcon sx={{ fontSize: 56, color: 'action.disabled' }} />
                      <Typography color="text.secondary">No items available to generate report</Typography>
                    </Stack>
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
                  <TableCell>{r.sku ?? '-'}</TableCell>
                  <TableCell align="right">
                    {r.quantity.toFixed(1)} {r.unit}
                  </TableCell>
                  <TableCell align="right">{r.reorderLevel}</TableCell>
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
