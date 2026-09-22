export interface Envelope<T> {
  success: boolean
  message: string
  data: T
}

export interface ApiErrorPayload {
  success: false
  message: string
  data: null
  errors?: Array<{ loc: (string | number)[]; msg: string; type: string }>
}
