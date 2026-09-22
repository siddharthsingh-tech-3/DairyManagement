import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { getTodaysDemand } from '@/api/reports'

export function AggregatedDemandCard() {
  const navigate = useNavigate()
  const { data: rows = [] } = useQuery({
    queryKey: ['reports', 'todays-demand'],
    queryFn: getTodaysDemand,
  })

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Box>
            <Typography fontWeight={600}>Aggregated demand — today</Typography>
            <Typography variant="caption" color="text.secondary">
              Today&apos;s deliveries and active recurring orders
            </Typography>
          </Box>
          <Button
            size="small"
            endIcon={<ArrowForwardIcon fontSize="small" />}
            onClick={() => navigate('/delivery')}
          >
            Allocate to trucks
          </Button>
        </Stack>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Vendor</TableCell>
              <TableCell>Product</TableCell>
              <TableCell align="right">Qty</TableCell>
              <TableCell>Type</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i}>
                <TableCell>{row.vendor_name}</TableCell>
                <TableCell>{row.product_name}</TableCell>
                <TableCell align="right">{row.quantity}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={row.order_type}
                    sx={{ textTransform: 'capitalize' }}
                    color={row.order_type === 'recurring' ? 'info' : 'default'}
                    variant="outlined"
                  />
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ color: 'text.secondary', py: 3 }}>
                  No demand for today yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
