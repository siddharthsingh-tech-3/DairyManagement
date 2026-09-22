import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { setUserPassword } from '@/api/users'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'
import type { User } from '@/types/models'

const schema = z.object({
  new_password: z.string().min(8, 'At least 8 characters'),
})

type FormValues = z.infer<typeof schema>

export function SetPasswordDialog({ user, onClose }: { user: User | null; onClose: () => void }) {
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => setUserPassword(user!.id, values.new_password),
    onSuccess: async () => {
      toast(`Password reset for ${user?.full_name}`)
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      reset()
      onClose()
    },
    onError: (error) => toast(extractErrorMessage(error), 'error'),
  })

  return (
    <Dialog open={!!user} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>Reset password</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Set a new temporary password for <b>{user?.full_name}</b>. They'll need it to log in — share it with them
          directly; this doesn't send anything automatically. They can change it themselves afterward.
        </DialogContentText>
        <TextField
          label="New temporary password"
          type="text"
          fullWidth
          autoFocus
          {...register('new_password')}
          error={!!errors.new_password}
          helperText={errors.new_password?.message}
        />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" disabled={mutation.isPending} onClick={handleSubmit((v) => mutation.mutate(v))}>
          Reset password
        </Button>
      </DialogActions>
    </Dialog>
  )
}
