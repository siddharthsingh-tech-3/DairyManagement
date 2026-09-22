import { ButtonBase, Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'

interface GenerateEInvoiceChoiceModalProps {
  open: boolean
  onClose: () => void
  onChoose: (withEwayBill: boolean) => void
}

export function GenerateEInvoiceChoiceModal({ open, onClose, onChoose }: GenerateEInvoiceChoiceModalProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        Generate E-Invoice
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pb: 3 }}>
        <Stack spacing={1.5}>
          <ChoiceOption
            icon={<DescriptionOutlinedIcon color="primary" />}
            label="Generate Only e-Invoice"
            onClick={() => onChoose(false)}
          />
          <ChoiceOption
            icon={<LocalShippingOutlinedIcon color="primary" />}
            label="Generate e-Invoice and e-Way Bill"
            onClick={() => onChoose(true)}
          />
        </Stack>
      </DialogContent>
    </Dialog>
  )
}

function ChoiceOption({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        justifyContent: 'flex-start',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        px: 2,
        py: 1.5,
        width: '100%',
        '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
      }}
    >
      {icon}
      <Typography fontWeight={500}>{label}</Typography>
    </ButtonBase>
  )
}
