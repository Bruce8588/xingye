import { useEffect, useRef } from 'react'

export default function StarField() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let animationId

    function resize() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Layer 1: Static background stars (small, dim)
    const bgStars = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 1.2 + 0.3,
      opacity: Math.random() * 0.4 + 0.1,
      twinkleSpeed: Math.random() * 0.015 + 0.005,
      twinkleDir: 1,
    }))

    // Layer 2: Midground floating particles (medium, gold)
    const midStars = Array.from({ length: 50 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 0.8,
      speedX: (Math.random() - 0.5) * 0.25,
      speedY: (Math.random() - 0.5) * 0.25,
      opacity: Math.random() * 0.5 + 0.25,
      twinkleSpeed: Math.random() * 0.02 + 0.008,
      twinkleDir: 1,
    }))

    // Layer 3: Foreground bright shooting stars (rare)
    const shootStars = Array.from({ length: 4 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.5,
      length: Math.random() * 80 + 40,
      speed: Math.random() * 4 + 3,
      angle: Math.PI * 0.15 + Math.random() * 0.1,
      opacity: 0,
      active: false,
      nextTime: Math.random() * 8000 + 3000,
    }))

    let lastShootTime = Date.now()

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw bg stars
      bgStars.forEach(s => {
        s.opacity += s.twinkleSpeed * s.twinkleDir
        if (s.opacity > 0.55 || s.opacity < 0.05) s.twinkleDir *= -1

        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(200, 210, 230, ${s.opacity})`
        ctx.fill()
      })

      // Draw mid stars
      midStars.forEach(s => {
        s.opacity += s.twinkleSpeed * s.twinkleDir
        if (s.opacity > 0.8 || s.opacity < 0.1) s.twinkleDir *= -1

        s.x += s.speedX
        s.y += s.speedY
        if (s.x < 0) s.x = canvas.width
        if (s.x > canvas.width) s.x = 0
        if (s.y < 0) s.y = canvas.height
        if (s.y > canvas.height) s.y = 0

        // Ensure radius is always valid (never 0 or NaN)
        const radius = Math.max(0.1, s.size * 3)
        try {
          const gradient = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, radius)
          gradient.addColorStop(0, `rgba(255, 215, 80, ${s.opacity})`)
          gradient.addColorStop(0.5, `rgba(255, 200, 50, ${s.opacity * 0.3})`)
          gradient.addColorStop(1, 'rgba(255, 180, 0, 0)')
          ctx.beginPath()
          ctx.arc(s.x, s.y, radius, 0, Math.PI * 2)
          ctx.fillStyle = gradient
          ctx.fill()
        } catch (e) { /* skip bad gradient */ }

        // Core
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 240, 180, ${s.opacity})`
        ctx.fill()
      })

      // Draw shooting stars
      const now = Date.now()
      shootStars.forEach(s => {
        if (!s.active && now - lastShootTime > s.nextTime) {
          s.active = true
          s.x = Math.random() * canvas.width * 0.7
          s.y = Math.random() * canvas.height * 0.3
          s.opacity = 0.9
          lastShootTime = now
        }

        if (s.active) {
          s.x += Math.cos(s.angle) * s.speed
          s.y += Math.sin(s.angle) * s.speed
          s.opacity -= 0.012

          if (s.opacity <= 0) {
            s.active = false
            s.nextTime = Math.random() * 8000 + 3000
          } else {
            ctx.save()
            ctx.globalAlpha = s.opacity
            const grad = ctx.createLinearGradient(
              s.x, s.y,
              s.x - Math.cos(s.angle) * s.length,
              s.y - Math.sin(s.angle) * s.length
            )
            grad.addColorStop(0, 'rgba(255, 240, 180, 0.9)')
            grad.addColorStop(1, 'rgba(255, 220, 100, 0)')
            ctx.strokeStyle = grad
            ctx.lineWidth = 2
            ctx.lineCap = 'round'
            ctx.beginPath()
            ctx.moveTo(s.x, s.y)
            ctx.lineTo(
              s.x - Math.cos(s.angle) * s.length,
              s.y - Math.sin(s.angle) * s.length
            )
            ctx.stroke()
            ctx.restore()
          }
        }
      })

      animationId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
      }}
    />
  )
}
