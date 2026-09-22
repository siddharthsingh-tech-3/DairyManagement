import { useEffect, useState } from 'react'
import {
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import CloseIcon from '@mui/icons-material/Close'
import dayjs from 'dayjs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteOffer, listOffers, updateOffer } from '@/api/offers'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'
import { OfferFormDialog } from './OfferFormDialog'
import type { Offer, Product } from '@/types/models'

export function ManageOffersDialog({
  open,
  onClose,
  products,
  startInCreateMode = false,
}: {
  open: boolean
  onClose: () => void
  products: Product[]
  startInCreateMode?: boolean
}) {
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(startInCreateMode)
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null)

  const { data: offers = [], isLoading } = useQuery({ queryKey: ['offers'], queryFn: listOffers, enabled: open })

  useEffect(() => {
    if (open) {
      setEditingOffer(null)
      setFormOpen(startInCreateMode)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const toggleActive = useMutation({
    mutationFn: (offer: Offer) => updateOffer(offer.id, { is_active: !offer.is_active }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['offers'] })
    },
    onError: (error) => toast(extractErrorMessage(error), 'error'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteOffer(id),
    onSuccess: async () => {
      toast('Offer deleted')
      await queryClient.invalidateQueries({ queryKey: ['offers'] })
    },
    onError: (error) => toast(extractErrorMessage(error), 'error'),
  })

  const statusChip = (offer: Offer) => {
    if (!offer.is_active) return <Chip size="small" label="Inactive" />
    if (offer.is_running) return <Chip size="small" color="success" label="Running" />
    if (dayjs(offer.valid_from).isAfter(dayjs())) return <Chip size="small" color="info" label="Scheduled" />
    return <Chip size="small" color="default" label="Expired" />
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 600 }}>
          Manage offers
          <IconButton onClick={onClose} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1.5 }}>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              size="small"
              onClick={() => {
                setEditingOffer(null)
                setFormOpen(true)
              }}
            >
              New offer
            </Button>
          </Stack>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Offer</TableCell>
                <TableCell>Discount</TableCell>
                <TableCell>Validity</TableCell>
                <TableCell>Applies to</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {offers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    {isLoading ? 'Loading…' : 'No offers yet — create one to promote your items'}
                  </TableCell>
                </TableRow>
              )}
              {offers.map((offer) => (
                <TableRow key={offer.id} hover>
                  <TableCell>
                    <Typography fontWeight={500} fontSize={13.5}>
                      {offer.title}
                    </Typography>
                    {offer.description && (
                      <Typography variant="caption" color="text.secondary">
                        {offer.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {offer.discount_type === 'percent' ? `${offer.discount_value}% off` : `₹${offer.discount_value} off`}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{dayjs(offer.valid_from).format('D MMM YY')}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {offer.valid_till ? `to ${dayjs(offer.valid_till).format('D MMM YY')}` : 'No end date'}
                    </Typography>
                  </TableCell>
                  <TableCell>{offer.applies_to_all ? 'All items' : `${offer.product_ids.length} item(s)`}</TableCell>
                  <TableCell>{statusChip(offer)}</TableCell>
                  <TableCell align="right">
                    <Tooltip title={offer.is_active ? 'Deactivate' : 'Activate'}>
                      <Switch size="small" checked={offer.is_active} onChange={() => toggleActive.mutate(offer)} />
                    </Tooltip>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditingOffer(offer)
                        setFormOpen(true)
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => remove.mutate(offer.id)}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      <OfferFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditingOffer(null)
        }}
        offer={editingOffer}
        products={products}
      />
    </>
  )
}
