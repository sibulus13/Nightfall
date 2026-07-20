const MONGO_WARMUP_TIMEOUT_MS = 3000

export async function register() {
    if (process.env.NEXT_RUNTIME === 'edge') {
        return
    }
    // Warm the Mongo connection pool at boot, but NEVER let a slow or
    // unreachable database block the server from coming up (e.g. local dev when
    // the Atlas SRV host doesn't resolve, or a network hiccup). The mongoose
    // driver retries a failed connect for up to serverSelectionTimeoutMS, which
    // would otherwise stall `next dev`/serverless bootstrap. So we bound the
    // warm-up with a timeout and attach a catch so a later rejection can never
    // become an unhandled rejection (which previously crashed all functions).
    try {
        const { default: run } = await import('~/lib/mongodb/db')
        const runPromise = run()
        runPromise.catch((error) => {
            console.error('Mongo instrumentation ping failed:', error)
        })
        await Promise.race([
            runPromise,
            new Promise((resolve) => setTimeout(resolve, MONGO_WARMUP_TIMEOUT_MS)),
        ])
    } catch (error) {
        console.error('Mongo instrumentation setup failed:', error)
    }
}
