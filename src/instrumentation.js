import connect from '~/lib/mongodb/db'

export async function register() {
    await connect()
}