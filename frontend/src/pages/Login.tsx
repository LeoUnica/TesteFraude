import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const CAPTCHA_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'

function generateCaptchaText(length = 5): string {
  return Array.from({ length }, () => CAPTCHA_CHARS[Math.floor(Math.random() * CAPTCHA_CHARS.length)]).join('')
}

function drawCaptcha(canvas: HTMLCanvasElement, text: string) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const W = canvas.width
  const H = canvas.height

  ctx.clearRect(0, 0, W, H)

  // Background
  ctx.fillStyle = '#eef2ff'
  ctx.fillRect(0, 0, W, H)

  // Noise lines
  for (let i = 0; i < 5; i++) {
    ctx.beginPath()
    ctx.moveTo(Math.random() * W, Math.random() * H)
    ctx.lineTo(Math.random() * W, Math.random() * H)
    ctx.strokeStyle = `rgba(${Math.random()*100|0},${Math.random()*100|0},${Math.random()*180|0},0.4)`
    ctx.lineWidth = 1.2
    ctx.stroke()
  }

  // Noise dots
  for (let i = 0; i < 40; i++) {
    ctx.beginPath()
    ctx.arc(Math.random() * W, Math.random() * H, 1, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${Math.random()*100|0},${Math.random()*100|0},${Math.random()*180|0},0.5)`
    ctx.fill()
  }

  // Characters
  const charW = W / (text.length + 1)
  text.split('').forEach((char, i) => {
    ctx.save()
    const x = charW * (i + 0.9)
    const y = H / 2 + 6
    ctx.translate(x, y)
    ctx.rotate((Math.random() - 0.5) * 0.5)
    ctx.font = `bold ${18 + Math.random() * 6}px monospace`
    ctx.fillStyle = `hsl(${220 + Math.random() * 40},${60 + Math.random() * 30}%,${25 + Math.random() * 20}%)`
    ctx.fillText(char, 0, 0)
    ctx.restore()
  })
}

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [captchaText, setCaptchaText] = useState('')
  const [captchaInput, setCaptchaInput] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const refreshCaptcha = useCallback(() => {
    const text = generateCaptchaText()
    setCaptchaText(text)
    setCaptchaInput('')
  }, [])

  useEffect(() => {
    refreshCaptcha()
  }, [refreshCaptcha])

  useEffect(() => {
    if (canvasRef.current && captchaText) {
      drawCaptcha(canvasRef.current, captchaText)
    }
  }, [captchaText])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (captchaInput.trim().toLowerCase() !== captchaText.toLowerCase()) {
      setError('Código de verificação incorreto. Tente novamente.')
      refreshCaptcha()
      return
    }

    setLoading(true)
    try {
      await login(form.username, form.password)
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao realizar login')
      refreshCaptcha()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">

          <div className="text-center mb-8">
            <img src="/LogoUnica.png" alt="Unica Promotora" className="w-40 mx-auto mb-4 object-contain" />
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Acesso ao Sistema de Antifraude</h2>
            <p className="text-sm text-gray-500 mt-1">Insira suas credenciais para continuar</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
              <span className="text-red-500 mt-0.5">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Usuário ou E-mail</label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                className="input-field"
                placeholder="Digite seu usuário ou e-mail"
                required
                autoComplete="off"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="input-field pr-10"
                  placeholder="Digite sua senha"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Código de verificação</label>
              <div className="flex items-center gap-2">
                <canvas
                  ref={canvasRef}
                  width={140}
                  height={44}
                  className="rounded border border-gray-300 cursor-pointer flex-shrink-0"
                  title="Clique para atualizar"
                  onClick={refreshCaptcha}
                />
                <button
                  type="button"
                  onClick={refreshCaptcha}
                  className="text-gray-400 hover:text-blue-600 transition-colors flex-shrink-0"
                  title="Gerar novo código"
                >
                  ↻
                </button>
                <input
                  type="text"
                  value={captchaInput}
                  onChange={e => setCaptchaInput(e.target.value)}
                  className="input-field flex-1"
                  placeholder="Digite o código"
                  required
                  autoComplete="off"
                  maxLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Autenticando...
                </>
              ) : 'Entrar'}
            </button>
          </form>

        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          © 2026 Unica Promotora · Todos os direitos reservados
        </p>
      </div>
    </div>
  )
}
