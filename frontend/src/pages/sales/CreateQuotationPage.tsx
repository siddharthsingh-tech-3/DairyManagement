import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControlLabel,
  Grid2 as Grid,
  IconButton,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { createQuotation } from '@/api/sales'
import { CustomerSelectField } from '@/features/sales/CustomerSelectField'
import { PurchaseLineItemsTable, emptyLineItem, type PurchaseLineItemDraft } from '@/features/purchases/PurchaseLineItemsTable'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'
import { formatCurrencyPrecise } from '@/utils/format'

function computeTotals(items: PurchaseLineItemDraft[], discountAmount: number, autoRoundOff: boolean) {
  const subtotal = items.reduce((s, i) => s + i.rate * i.quantity * (1 - i.discount_percent / 100), 0)
  const taxAmount = items.reduce((s, i) => s + (i.rate * i.quantity * (1 - i.discount_percent / 100) * i.tax_percent) / 100, 0)
  const beforeRoundOff = subtotal - discountAmount + taxAmount
  const roundOff = autoRoundOff ? Math.round(beforeRoundOff) - beforeRoundOff : 0
  return { subtotal, taxAmount, roundOff, total: beforeRoundOff + roundOff }
}

export function CreateQuotationPage() {
  const navigate = useNavigate()
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()

  const [vendorId, setVendorId] = useState('')
  const [quoteDate, setQuoteDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [validTillEnabled, setValidTillEnabled] = useState(false)
  const [validTill, setValidTill] = useState(dayjs().add(15, 'day').format('YYYY-MM-DD'))
  const [items, setItems] = useState<PurchaseLineItemDraft[]>([{ ...emptyLineItem }])
  const [discountEnabled, setDiscountEnabled] = useState(false)
  const [discountAmount, setDiscountAmount] = useState(0)
  const [autoRoundOff, setAutoRoundOff] = useState(true)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const totals = useMemo(
    () => computeTotals(items, discountEnabled ? discountAmount : 0, autoRoundOff),
    [items, discountEnabled, discountAmount, autoRoundOff],
  )

  const mutation = useMutation({
    mutationFn: () =>
      createQuotation({
        vendor_id: vendorId,
        quote_date: quoteDate,
        valid_till: validTillEnabled ? validTill : null,
        notes: notes || null,
        discount_amount: discountEnabled ? discountAmount : 0,
        round_off: totals.roundOff,
        items: items
          .filter((i) => i.description)
          .map((i) => ({
            product_id: i.product_id,
            description: i.description,
            hsn_code: i.hsn_code,
            quantity: i.quantity,
            rate: i.rate,
            discount_percent: i.discount_percent,
            tax_percent: i.tax_percent,
          })),
      }),
    onSuccess: async () => {
      toast('Quotation saved')
      await queryClient.invalidateQueries({ queryKey: ['quotations'] })
      navigate('/sales/quotations')
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  })

  const handleSave = () => {
    if (!vendorId) {
      setError('Select a customer')
      return
    }
    if (items.filter((i) => i.description).length === 0) {
      setError('Add at least one line item')
      return
    }
    setError('')
    mutation.mutate()
  }

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <IconButton onClick={() => navigate('/sales/quotations')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" fontWeight={600}>
          Create Quotation/Estimate
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" disabled={mutation.isPending} onClick={handleSave}>
          Save
        </Button>
      </Stack>

      {error && (
        <Typography color="error" fontWeight={600}>
          {error}
        </Typography>
      )}

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={2.5}>
            <Card variant="outlined">
              <CardContent>
                <Typography fontWeight={600} sx={{ mb: 2 }}>
                  Customer Details
                </Typography>
                <CustomerSelectField value={vendorId} onChange={setVendorId} />
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Typography fontWeight={600} sx={{ mb: 2 }}>
                  Quotation Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={6}>
                    <TextField
                      label="Quotation Date"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      value={quoteDate}
                      onChange={(e) => setQuoteDate(e.target.value)}
                    />
                  </Grid>
                  <Grid size={6}>
                    <FormControlLabel
                      control={<Switch checked={validTillEnabled} onChange={(e) => setValidTillEnabled(e.target.checked)} />}
                      label="Valid Till"
                    />
                    {validTillEnabled && (
                      <TextField
                        type="date"
                        size="small"
                        sx={{ ml: 2 }}
                        InputLabelProps={{ shrink: true }}
                        value={validTill}
                        onChange={(e) => setValidTill(e.target.value)}
                      />
                    )}
                  </Grid>
                  <Grid size={12}>
                    <TextField label="Notes" fullWidth multiline minRows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Typography fontWeight={600} sx={{ mb: 2 }}>
                  Line Items
                </Typography>
                <PurchaseLineItemsTable items={items} onChange={setItems} />
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography fontWeight={600} sx={{ mb: 2 }}>
                Quotation Summary
              </Typography>
              <Stack spacing={1.5}>
                <FormControlLabel
                  control={<Switch checked={discountEnabled} onChange={(e) => setDiscountEnabled(e.target.checked)} />}
                  label="Add Discount"
                />
                {discountEnabled && (
                  <TextField
                    label="Discount amount"
                    type="number"
                    size="small"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Number(e.target.value))}
                  />
                )}

                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Taxable Amount</Typography>
                  <Typography fontWeight={500}>{formatCurrencyPrecise(totals.subtotal)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Tax</Typography>
                  <Typography fontWeight={500}>{formatCurrencyPrecise(totals.taxAmount)}</Typography>
                </Stack>

                <FormControlLabel
                  control={<Switch checked={autoRoundOff} onChange={(e) => setAutoRoundOff(e.target.checked)} />}
                  label={`Auto Round Off (${formatCurrencyPrecise(totals.roundOff)})`}
                />

                <Divider />

                <Stack direction="row" justifyContent="space-between">
                  <Typography fontWeight={600}>Total Amount</Typography>
                  <Typography fontWeight={600} fontSize={18}>
                    {formatCurrencyPrecise(totals.total)}
                  </Typography>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  )
}
