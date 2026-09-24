import { createServer } from 'vite'

async function start() {
  const server = await createServer({
    server: {
      port: 5173,
      host: '0.0.0.0',
      strictPort: true,
    },
  })
  await server.listen()
  server.printUrls()
  console.log('WanderMatch dev server permanently listening on port 5173')
}

start().catch((err) => {
  console.error('Error starting WanderMatch dev server:', err)
})
