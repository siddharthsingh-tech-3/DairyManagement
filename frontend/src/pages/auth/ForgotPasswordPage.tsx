import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button, Link as MuiLink, Stack, TextField, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { forgotPassword } from '@/api/auth'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'

const schema = z.object({ email: z.string().email('Enter a valid email') })
type FormValues = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const toast = useToastStore((s) => s.show)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => forgotPassword(values.email),
    onSuccess: () => toast('If that email exists, a reset link has been sent'),
    onError: (error) => toast(extractErrorMessage(error), 'error'),
  })

  return (
    <Stack spacing={2.5} component="form" onSubmit={handleSubmit((v) => mutation.mutate(v))}>
      <Typography variant="h6" fontWeight={600}>
        Forgot password
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Enter your account email and we'll send a reset link.
      </Typography>
      <TextField
        label="Email"
        type="email"
        fullWidth
        {...register('email')}
        error={!!errors.email}
        helperText={errors.email?.message}
      />
      <Button type="submit" variant="contained" size="large" disabled={mutation.isPending}>
        Send reset link
      </Button>
      <MuiLink component={RouterLink} to="/login" variant="body2" textAlign="center">
        Back to sign in
      </MuiLink>
    </Stack>
  )
}
