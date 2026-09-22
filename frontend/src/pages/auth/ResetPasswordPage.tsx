import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button, Stack, TextField, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { resetPassword } from '@/api/auth'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'

const schema = z
  .object({
    password: z.string().min(8, 'At least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const navigate = useNavigate()
  const toast = useToastStore((s) => s.show)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => resetPassword(token, values.password),
    onSuccess: () => {
      toast('Password reset — please sign in')
      navigate('/login', { replace: true })
    },
    onError: (error) => toast(extractErrorMessage(error), 'error'),
  })

  return (
    <Stack spacing={2.5} component="form" onSubmit={handleSubmit((v) => mutation.mutate(v))}>
      <Typography variant="h6" fontWeight={600}>
        Reset password
      </Typography>
      <TextField
        label="New password"
        type="password"
        fullWidth
        {...register('password')}
        error={!!errors.password}
        helperText={errors.password?.message}
      />
      <TextField
        label="Confirm password"
        type="password"
        fullWidth
        {...register('confirmPassword')}
        error={!!errors.confirmPassword}
        helperText={errors.confirmPassword?.message}
      />
      <Button type="submit" variant="contained" size="large" disabled={mutation.isPending || !token}>
        Reset password
      </Button>
      {!token && (
        <Typography variant="caption" color="error">
          Missing reset token — use the link from your email.
        </Typography>
      )}
    </Stack>
  )
}
